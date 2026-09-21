import { describe, expect, it, vi } from "vitest";
import { DiffusersBackend } from "../src/backends/diffusers.js";

const PIXEL = Buffer.from("fake-png-bytes").toString("base64");

function stubFetch(handler: (path: string, body: any) => unknown) {
  return vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    const path = new URL(String(url)).pathname;
    const body = init?.body ? JSON.parse(String(init.body)) : {};
    const result = handler(path, body);
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }) as unknown as typeof fetch;
}

describe("DiffusersBackend", () => {
  it("derives pixel dimensions from resolution and aspect ratio", async () => {
    const seen: any[] = [];
    const backend = new DiffusersBackend({
      baseUrl: "http://sidecar.test",
      fetchImpl: stubFetch((_path, body) => {
        seen.push(body);
        return [{ id: "img1", width: body.width, height: body.height, image_b64: PIXEL, seed: 5 }];
      }),
    });

    const ref = await backend.textToImage({
      prompt: "a portrait",
      model: "sdxl",
      aspectRatio: "16:9",
      resolution: "2k",
    });

    expect(seen[0].width).toBe(2048);
    expect(seen[0].height).toBe(1152);
    expect(ref).toEqual({ id: "img1", widthPx: 2048, heightPx: 1152, backend: "diffusers" });
  });

  it("passes sampler settings through to the sidecar", async () => {
    let body: any;
    const backend = new DiffusersBackend({
      baseUrl: "http://sidecar.test",
      scheduler: "euler_ancestral",
      steps: 42,
      guidanceScale: 3.5,
      fetchImpl: stubFetch((_p, b) => {
        body = b;
        return [{ id: "i", width: 1024, height: 1024, image_b64: PIXEL, seed: 1 }];
      }),
    });
    await backend.textToImage({
      prompt: "x",
      model: "sdxl",
      aspectRatio: "1:1",
      resolution: "1k",
      seed: 99,
    });
    expect(body.scheduler).toBe("euler_ancestral");
    expect(body.steps).toBe(42);
    expect(body.guidance_scale).toBe(3.5);
    expect(body.seed).toBe(99);
  });

  it("upscales through a low-strength img2img pass", async () => {
    const paths: string[] = [];
    let upscaleBody: any;
    const backend = new DiffusersBackend({
      baseUrl: "http://sidecar.test",
      upscaleStrength: 0.35,
      fetchImpl: stubFetch((path, body) => {
        paths.push(path);
        if (path === "/img2img") upscaleBody = body;
        return [
          {
            id: path === "/txt2img" ? "base" : "big",
            width: body.width,
            height: body.height,
            image_b64: PIXEL,
            seed: 1,
          },
        ];
      }),
    });

    const base = await backend.textToImage({
      prompt: "x",
      model: "sdxl",
      aspectRatio: "1:1",
      resolution: "1k",
    });
    const big = await backend.upscale({ image: base, targetWidthPx: 2048, targetHeightPx: 2048 });

    expect(paths).toEqual(["/txt2img", "/img2img"]);
    expect(upscaleBody.strength).toBe(0.35);
    expect(upscaleBody.image_b64).toBe(PIXEL);
    expect(big.widthPx).toBe(2048);
  });

  it("refuses to upscale an image from another backend, naming why", async () => {
    const backend = new DiffusersBackend({
      baseUrl: "http://sidecar.test",
      fetchImpl: stubFetch(() => []),
    });
    await expect(
      backend.upscale({
        image: { id: "foreign", widthPx: 1024, heightPx: 1024, backend: "higgsfield" },
        targetWidthPx: 2048,
        targetHeightPx: 2048,
      }),
    ).rejects.toThrow(/do not port between backends/);
  });

  it("surfaces the sidecar's error body rather than a bare status", async () => {
    const backend = new DiffusersBackend({
      baseUrl: "http://sidecar.test",
      fetchImpl: vi.fn(async () =>
        new Response("out of VRAM; reduce width, height or batch_size", { status: 507 }),
      ) as unknown as typeof fetch,
    });
    await expect(
      backend.textToImage({ prompt: "x", model: "sdxl", aspectRatio: "1:1", resolution: "4k" }),
    ).rejects.toThrow(/507.*out of VRAM/s);
  });

  it("reports local rendering as costing nothing", async () => {
    const backend = new DiffusersBackend({ baseUrl: "http://sidecar.test" });
    expect(await backend.estimateTextToImage()).toBe(0);
    expect(await backend.estimateUpscale()).toBe(0);
  });
});
