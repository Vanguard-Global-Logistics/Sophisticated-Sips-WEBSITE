/**
 * Local GPU backend: talks to the Python diffusers sidecar in python/.
 *
 * Local rendering is free per image, so `estimate*` return 0 credits. The real
 * cost is VRAM and wall-clock, which the sidecar reports on rather than
 * charging for.
 */
import type {
  ImageBackend,
  ImageRef,
  TextToImageRequest,
  UpscaleRequest,
} from "../graph/types.js";
import { dimensionsFor } from "../render/ladder.js";

export interface DiffusersOptions {
  readonly baseUrl: string;
  /** Sampler name the sidecar recognises. */
  readonly scheduler?: string;
  readonly steps?: number;
  readonly guidanceScale?: number;
  /**
   * Denoising strength for upscale passes. Low values enlarge and sharpen
   * without re-inventing the subject; high values redraw it. 0.35 is the usual
   * sweet spot for a hires pass.
   */
  readonly upscaleStrength?: number;
  readonly fetchImpl?: typeof fetch;
  readonly timeoutMs?: number;
}

interface SidecarImage {
  readonly id: string;
  readonly width: number;
  readonly height: number;
  readonly image_b64: string;
  readonly seed: number;
}

export class DiffusersBackend implements ImageBackend {
  readonly name = "diffusers";
  readonly #options: Required<Omit<DiffusersOptions, "fetchImpl">> & {
    fetchImpl: typeof fetch;
  };
  /** Base64 payloads, kept out of ImageRef so graph manifests stay readable. */
  readonly #images = new Map<string, string>();

  constructor(options: DiffusersOptions) {
    this.#options = {
      baseUrl: options.baseUrl.replace(/\/+$/, ""),
      scheduler: options.scheduler ?? "dpmpp_2m",
      steps: options.steps ?? 30,
      guidanceScale: options.guidanceScale ?? 6.0,
      upscaleStrength: options.upscaleStrength ?? 0.35,
      timeoutMs: options.timeoutMs ?? 600_000,
      fetchImpl: options.fetchImpl ?? fetch,
    };
  }

  /** Local rendering spends no credits. */
  async estimateTextToImage(): Promise<number> {
    return 0;
  }

  async estimateUpscale(): Promise<number> {
    return 0;
  }

  async textToImage(req: TextToImageRequest): Promise<ImageRef> {
    const dims = dimensionsFor(resolutionToEdge(req.resolution), req.aspectRatio);
    const [image] = await this.#post<SidecarImage[]>("/txt2img", {
      prompt: req.prompt,
      negative_prompt: req.negative ?? null,
      width: dims.widthPx,
      height: dims.heightPx,
      steps: this.#options.steps,
      guidance_scale: this.#options.guidanceScale,
      scheduler: this.#options.scheduler,
      seed: req.seed ?? null,
      batch_size: 1,
    });
    if (!image) throw new Error("sidecar returned no image for /txt2img");
    return this.#track(image);
  }

  /**
   * Enlarge via a low-strength img2img pass at the target size -- the same
   * "hires fix" A1111 popularised. It resolves detail rather than inventing
   * composition, which is what an upscale should do.
   */
  async upscale(req: UpscaleRequest): Promise<ImageRef> {
    const source = this.#images.get(req.image.id);
    if (!source) {
      throw new Error(
        `image "${req.image.id}" was not produced by this backend, so its pixels are ` +
          `not available locally; image ids do not port between backends`,
      );
    }
    const [image] = await this.#post<SidecarImage[]>("/img2img", {
      prompt: "",
      image_b64: source,
      width: req.targetWidthPx,
      height: req.targetHeightPx,
      strength: this.#options.upscaleStrength,
      steps: this.#options.steps,
      guidance_scale: this.#options.guidanceScale,
      scheduler: this.#options.scheduler,
      seed: null,
      batch_size: 1,
    });
    if (!image) throw new Error("sidecar returned no image for /img2img");
    return this.#track(image);
  }

  /** Base64 pixels for an image this backend produced, if still held. */
  getImageData(id: string): string | undefined {
    return this.#images.get(id);
  }

  #track(image: SidecarImage): ImageRef {
    this.#images.set(image.id, image.image_b64);
    return {
      id: image.id,
      widthPx: image.width,
      heightPx: image.height,
      backend: this.name,
    };
  }

  async #post<T>(path: string, body: unknown): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.#options.timeoutMs);
    try {
      const response = await this.#options.fetchImpl(`${this.#options.baseUrl}${path}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (!response.ok) {
        const detail = await response.text().catch(() => "");
        throw new Error(
          `sidecar ${path} responded ${response.status}${detail ? `: ${detail.slice(0, 400)}` : ""}`,
        );
      }
      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error(
          `sidecar ${path} timed out after ${this.#options.timeoutMs}ms; a large frame on a ` +
            `slow card can legitimately exceed this, so raise timeoutMs before assuming a hang`,
        );
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }
}

/** "4k" -> 4096. Falls back to 1024 for anything unrecognised. */
function resolutionToEdge(resolution: string): number {
  const match = /^(\d+(?:\.\d+)?)k$/i.exec(resolution.trim());
  if (match) return Math.round(Number(match[1]) * 1024);
  const literal = Number(resolution);
  return Number.isFinite(literal) && literal > 0 ? literal : 1024;
}
