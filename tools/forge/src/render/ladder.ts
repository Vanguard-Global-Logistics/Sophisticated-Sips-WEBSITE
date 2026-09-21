/**
 * Resolution ladder planning.
 *
 * No current text-to-image model renders 8K in one pass. The honest route to a
 * 7680px frame is to render natively as large as the chosen model allows, then
 * climb in upscale steps. This module plans that climb.
 *
 * Two rules shape the plan. Render the base as large as the model natively
 * supports, because detail invented by an upscaler is never as good as detail
 * the generator composed. And keep each step at or under a 4x linear jump --
 * the scale upscalers are built and named for -- past which they start
 * hallucinating texture rather than resolving it.
 */

/** The largest frame a model will render in a single pass. */
export interface ModelCapability {
  readonly model: string;
  readonly label: string;
  /** Longest edge, pixels, at the model's best setting. */
  readonly nativeMaxEdgePx: number;
  /** Provider params that select that best setting. */
  readonly nativeParams: Readonly<Record<string, ParamValue>>;
  readonly notes: string;
}

/**
 * Native ceilings as advertised by each provider. `nativeMaxEdgePx` is the
 * longest edge at a 16:9 framing, which is the shape these ceilings are quoted
 * against.
 */
export const MODEL_CAPABILITIES: readonly ModelCapability[] = [
  {
    model: "seedream_v4_5",
    label: "Seedream 4.5",
    nativeMaxEdgePx: 6144,
    nativeParams: { quality: "high" },
    notes: "Highest native ceiling available; reaches roughly 6K before any upscale.",
  },
  {
    model: "gpt_image_2_5",
    label: "GPT Image 2.5",
    nativeMaxEdgePx: 4096,
    nativeParams: { resolution: "4k", quality: "high" },
    notes: "Strong prompt adherence and text rendering.",
  },
  {
    model: "nano_banana_pro",
    label: "Nano Banana Pro",
    nativeMaxEdgePx: 4096,
    nativeParams: { resolution: "4k" },
    notes: "Photorealistic and comparatively cheap at 4K.",
  },
  {
    model: "cinematic_studio_2_5",
    label: "Cinema Studio Image 2.5",
    nativeMaxEdgePx: 4096,
    nativeParams: { resolution: "4k" },
    notes: "Cinematic stills; pairs well with anamorphic and film-stock setups.",
  },
  {
    model: "soul_cinematic",
    label: "Soul Cinema",
    nativeMaxEdgePx: 2048,
    nativeParams: { quality: "2k" },
    notes: "Cinema-grade look but a 2K ceiling, so it needs the longest ladder.",
  },
];

export interface Dimensions {
  readonly widthPx: number;
  readonly heightPx: number;
}

/**
 * Provider params keep their JSON type. Topaz declares output_width and
 * output_height as numbers, and sending them as strings is rejected, so the
 * plan must not flatten everything to text.
 */
export type ParamValue = string | number | boolean;

export interface LadderStep {
  readonly kind: "generate" | "upscale";
  readonly model: string;
  readonly params: Readonly<Record<string, ParamValue>>;
  readonly output: Dimensions;
  /** Longest-edge growth over the previous step; 1 for the generate step. */
  readonly scaleFactor: number;
}

export interface LadderPlan {
  readonly target: Dimensions;
  readonly steps: readonly LadderStep[];
  readonly base: ModelCapability;
  /** True when the target was reached natively, with no upscale step. */
  readonly nativeOnly: boolean;
  readonly notes: readonly string[];
}

/** Named targets, so callers can say "8k" rather than juggling pixel counts. */
export const RESOLUTION_TARGETS = {
  "1k": 1024,
  "2k": 2048,
  "4k": 4096,
  "6k": 6144,
  "8k": 7680,
} as const;

export type ResolutionTarget = keyof typeof RESOLUTION_TARGETS;

/** Parse an "W:H" ratio into its numeric parts. */
export function parseAspectRatio(ratio: string): { w: number; h: number } {
  const match = /^(\d+(?:\.\d+)?):(\d+(?:\.\d+)?)$/.exec(ratio.trim());
  if (!match) throw new RangeError(`aspect ratio must look like "16:9", received "${ratio}"`);
  const w = Number(match[1]);
  const h = Number(match[2]);
  if (w <= 0 || h <= 0) throw new RangeError(`aspect ratio parts must be positive: "${ratio}"`);
  return { w, h };
}

/** Frame dimensions for a target longest edge at a given aspect ratio. */
export function dimensionsFor(target: ResolutionTarget | number, aspectRatio: string): Dimensions {
  const longestEdge = typeof target === "number" ? target : RESOLUTION_TARGETS[target];
  const { w, h } = parseAspectRatio(aspectRatio);
  const landscape = w >= h;
  // Round to an even pixel count; odd dimensions trip several encoders.
  const round = (n: number) => Math.max(2, Math.round(n / 2) * 2);
  return landscape
    ? { widthPx: round(longestEdge), heightPx: round((longestEdge * h) / w) }
    : { widthPx: round((longestEdge * w) / h), heightPx: round(longestEdge) };
}

/**
 * Largest jump permitted in one upscale step, as a ratio of longest edge.
 * Linear, not area: a "4x upscale" means four times the edge, and that is the
 * scale these models are trained and marketed at.
 */
const MAX_STEP_SCALE = 4;

export interface PlanOptions {
  readonly target: ResolutionTarget | number;
  readonly aspectRatio: string;
  /** Force a particular base model; otherwise the highest native ceiling wins. */
  readonly model?: string;
  /** Upscaler used for every climb step. */
  readonly upscaler?: string;
}

/**
 * Plan the cheapest correct route to `target`.
 *
 * Throws if a named base model cannot be found, because silently substituting
 * a different model would change the look the caller asked for.
 */
export function planLadder(options: PlanOptions): LadderPlan {
  const target = dimensionsFor(options.target, options.aspectRatio);
  const upscaler = options.upscaler ?? "topaz_image_generative";
  const notes: string[] = [];

  let base: ModelCapability | undefined;
  if (options.model) {
    base = MODEL_CAPABILITIES.find((m) => m.model === options.model);
    if (!base) {
      throw new RangeError(
        `unknown base model "${options.model}"; known: ` +
          MODEL_CAPABILITIES.map((m) => m.model).join(", "),
      );
    }
  } else {
    base = MODEL_CAPABILITIES.reduce((best, m) =>
      m.nativeMaxEdgePx > best.nativeMaxEdgePx ? m : best,
    );
  }

  const targetLongest = Math.max(target.widthPx, target.heightPx);
  const baseLongest = Math.min(base.nativeMaxEdgePx, targetLongest);
  const baseDims = dimensionsFor(baseLongest, options.aspectRatio);

  const steps: LadderStep[] = [
    {
      kind: "generate",
      model: base.model,
      params: base.nativeParams,
      output: baseDims,
      scaleFactor: 1,
    },
  ];

  if (baseLongest >= targetLongest) {
    return { target, steps, base, nativeOnly: true, notes };
  }

  // Climb in as few steps as possible without exceeding the per-step limit.
  // Steps are evenly sized in log space so no single one does the heavy lifting.
  const totalScale = targetLongest / baseLongest;
  const stepCount = Math.max(1, Math.ceil(Math.log(totalScale) / Math.log(MAX_STEP_SCALE)));
  const perStep = Math.pow(totalScale, 1 / stepCount);

  let currentLongest = baseLongest;
  for (let i = 0; i < stepCount; i += 1) {
    const isLast = i === stepCount - 1;
    const nextLongest = isLast ? targetLongest : Math.round(currentLongest * perStep);
    const dims = isLast ? target : dimensionsFor(nextLongest, options.aspectRatio);
    steps.push({
      kind: "upscale",
      model: upscaler,
      params: {
        output_width: dims.widthPx,
        output_height: dims.heightPx,
      },
      output: dims,
      scaleFactor: nextLongest / currentLongest,
    });
    currentLongest = nextLongest;
  }

  notes.push(
    `${base.label} renders natively to ${baseDims.widthPx}x${baseDims.heightPx}; ` +
      `${stepCount} upscale step${stepCount === 1 ? "" : "s"} carry it to ` +
      `${target.widthPx}x${target.heightPx}.`,
  );
  if (targetLongest > 4096) {
    notes.push(
      "Above 4K the added pixels come from the upscaler, not the generator. " +
        "They resolve real detail rather than invent it, but do not expect new composition.",
    );
  }

  return { target, steps, base, nativeOnly: false, notes };
}
