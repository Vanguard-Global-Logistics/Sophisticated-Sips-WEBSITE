/**
 * A backend that mints deterministic fake images.
 *
 * Every test in this package runs against it, so the suite exercises the real
 * graph, cache and ladder code paths without spending a credit. Determinism
 * matters: the same request must return the same id, or cache tests cannot tell
 * a genuine hit from a coincidence.
 */
import { createHash } from "node:crypto";
import type {
  ImageBackend,
  ImageRef,
  TextToImageRequest,
  UpscaleRequest,
} from "../graph/types.js";

export class MockBackend implements ImageBackend {
  readonly name = "mock";
  /** Every call made, in order, for assertions. */
  readonly calls: Array<{ kind: "textToImage" | "upscale"; request: unknown }> = [];

  async estimateTextToImage(req: TextToImageRequest): Promise<number> {
    return req.resolution === "4k" ? 20 : 5;
  }

  async textToImage(req: TextToImageRequest): Promise<ImageRef> {
    this.calls.push({ kind: "textToImage", request: req });
    const [w, h] = parseRatio(req.aspectRatio);
    const edge = Number(req.resolution.replace("k", "")) * 1024 || 1024;
    return {
      id: digest(`t2i:${req.model}:${req.prompt}:${req.seed ?? 0}`),
      widthPx: w >= h ? edge : Math.round((edge * w) / h),
      heightPx: w >= h ? Math.round((edge * h) / w) : edge,
      backend: this.name,
    };
  }

  async estimateUpscale(req: UpscaleRequest): Promise<number> {
    const growth = (req.targetWidthPx * req.targetHeightPx) / (req.image.widthPx * req.image.heightPx);
    return Math.ceil(growth * 4);
  }

  async upscale(req: UpscaleRequest): Promise<ImageRef> {
    this.calls.push({ kind: "upscale", request: req });
    return {
      id: digest(`up:${req.image.id}:${req.targetWidthPx}x${req.targetHeightPx}`),
      widthPx: req.targetWidthPx,
      heightPx: req.targetHeightPx,
      backend: this.name,
    };
  }
}

function digest(input: string): string {
  return createHash("sha256").update(input).digest("hex").slice(0, 16);
}

function parseRatio(ratio: string): [number, number] {
  const [w, h] = ratio.split(":").map(Number);
  return [w || 1, h || 1];
}
