/**
 * The built-in node library.
 *
 * Each node is small and total: it validates its own params, and it either
 * produces its output or throws. Composition lives in the graph, not inside
 * nodes, which is what keeps the cache addresses meaningful.
 */
import type { AnyNodeDefinition, ImageRef, NodeDefinition } from "../graph/types.js";
import { compilePrompt, type CompiledPrompt } from "../optics/compile.js";
import { solveShot, type ShotRequest, type SolvedShot } from "../optics/solve.js";
import {
  CAMERAS,
  FILM_STOCKS,
  LENSES,
  LIGHTING,
  type CameraId,
  type FilmStockId,
  type LensId,
  type LightingId,
} from "../optics/catalog.js";
import { dimensionsFor, planLadder, type ResolutionTarget } from "../render/ladder.js";

/** Read a required property off an unknown params object. */
function field(raw: unknown, name: string): unknown {
  if (typeof raw !== "object" || raw === null) {
    throw new TypeError(`params must be an object, received ${raw === null ? "null" : typeof raw}`);
  }
  return (raw as Record<string, unknown>)[name];
}

function requireString(raw: unknown, name: string): string {
  const value = field(raw, name);
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError(`"${name}" must be a non-empty string`);
  }
  return value;
}

function requireNumber(raw: unknown, name: string): number {
  const value = field(raw, name);
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TypeError(`"${name}" must be a finite number`);
  }
  return value;
}

function optionalNumber(raw: unknown, name: string): number | undefined {
  const value = field(raw, name);
  if (value === undefined) return undefined;
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TypeError(`"${name}" must be a finite number when present`);
  }
  return value;
}

function requireKeyOf<T extends Record<string, unknown>>(
  raw: unknown,
  name: string,
  table: T,
): keyof T {
  const value = requireString(raw, name);
  if (!(value in table)) {
    throw new TypeError(`"${name}" must be one of: ${Object.keys(table).join(", ")}`);
  }
  return value as keyof T;
}

/** Solve a camera setup into a physically checked shot. */
export const cameraRigNode: NodeDefinition<ShotRequest, Record<string, never>, SolvedShot> = {
  type: "camera_rig",
  summary: "Validate a camera, lens and exposure against physics, and solve the optics.",
  inputs: {},
  output: { type: "shot", description: "The solved shot, with depth of field and exposure." },
  parseParams(raw): ShotRequest {
    const backgroundDistanceM = optionalNumber(raw, "backgroundDistanceM");
    const notes = field(raw, "notes");
    if (notes !== undefined && typeof notes !== "string") {
      throw new TypeError(`"notes" must be a string when present`);
    }
    return {
      subject: requireString(raw, "subject"),
      camera: requireKeyOf(raw, "camera", CAMERAS) as CameraId,
      lens: requireKeyOf(raw, "lens", LENSES) as LensId,
      focalMm: requireNumber(raw, "focalMm"),
      aperture: requireNumber(raw, "aperture"),
      subjectDistanceM: requireNumber(raw, "subjectDistanceM"),
      shutterSeconds: requireNumber(raw, "shutterSeconds"),
      iso: requireNumber(raw, "iso"),
      film: requireKeyOf(raw, "film", FILM_STOCKS) as FilmStockId,
      lighting: requireKeyOf(raw, "lighting", LIGHTING) as LightingId,
      ...(backgroundDistanceM !== undefined ? { backgroundDistanceM } : {}),
      ...(notes !== undefined ? { notes } : {}),
    };
  },
  async run({ params, ctx }) {
    const shot = solveShot(params);
    for (const warning of shot.warnings) ctx.log(`camera_rig: ${warning}`);
    return shot;
  },
};

/** Turn a solved shot into prompt text. */
export const promptNode: NodeDefinition<
  Record<string, never>,
  { shot: SolvedShot },
  CompiledPrompt
> = {
  type: "compile_prompt",
  summary: "Compile a solved shot into prompt text describing the computed optics.",
  inputs: { shot: { type: "shot", description: "A solved shot from camera_rig." } },
  output: { type: "prompt", description: "Prompt text plus its labelled segments." },
  parseParams() {
    return {};
  },
  async run({ inputs }) {
    return compilePrompt(inputs.shot);
  },
};

export interface RenderParams {
  readonly model: string;
  readonly aspectRatio: string;
  readonly resolution: string;
  readonly seed?: number;
}

/** Render a prompt into a base image. Spends money. */
export const renderNode: NodeDefinition<RenderParams, { prompt: CompiledPrompt }, ImageRef> = {
  type: "render",
  summary: "Generate the base image from a compiled prompt.",
  inputs: { prompt: { type: "prompt", description: "Compiled prompt text." } },
  output: { type: "image", description: "The generated base image." },
  billable: true,
  parseParams(raw): RenderParams {
    const seed = optionalNumber(raw, "seed");
    return {
      model: requireString(raw, "model"),
      aspectRatio: requireString(raw, "aspectRatio"),
      resolution: requireString(raw, "resolution"),
      ...(seed !== undefined ? { seed } : {}),
    };
  },
  async run({ params, inputs, ctx }) {
    return ctx.backend.textToImage({
      prompt: inputs.prompt.prompt,
      negative: inputs.prompt.negative,
      model: params.model,
      aspectRatio: params.aspectRatio,
      resolution: params.resolution,
      ...(params.seed !== undefined ? { seed: params.seed } : {}),
    });
  },
};

export interface LadderParams {
  readonly target: ResolutionTarget | number;
  readonly aspectRatio: string;
  readonly upscaler?: string;
}

/** Climb an image to the target resolution. Spends money per step. */
export const ladderNode: NodeDefinition<LadderParams, { image: ImageRef }, ImageRef> = {
  type: "resolution_ladder",
  summary: "Upscale a base image to the target resolution in safe steps.",
  inputs: { image: { type: "image", description: "The base image to climb from." } },
  output: { type: "image", description: "The image at the target resolution." },
  billable: true,
  parseParams(raw): LadderParams {
    const target = field(raw, "target");
    if (typeof target !== "string" && typeof target !== "number") {
      throw new TypeError(`"target" must be a resolution name or a pixel count`);
    }
    const upscaler = field(raw, "upscaler");
    if (upscaler !== undefined && typeof upscaler !== "string") {
      throw new TypeError(`"upscaler" must be a string when present`);
    }
    return {
      target: target as ResolutionTarget | number,
      aspectRatio: requireString(raw, "aspectRatio"),
      ...(upscaler !== undefined ? { upscaler } : {}),
    };
  },
  async run({ params, inputs, ctx }) {
    const target = dimensionsFor(params.target, params.aspectRatio);
    const plan = planLadder({
      target: params.target,
      aspectRatio: params.aspectRatio,
      ...(params.upscaler !== undefined ? { upscaler: params.upscaler } : {}),
    });

    let current = inputs.image;
    for (const step of plan.steps) {
      if (step.kind !== "upscale") continue;
      if (current.widthPx >= target.widthPx && current.heightPx >= target.heightPx) break;
      ctx.log(
        `resolution_ladder: ${current.widthPx}x${current.heightPx} -> ` +
          `${step.output.widthPx}x${step.output.heightPx}`,
      );
      current = await ctx.backend.upscale({
        image: current,
        targetWidthPx: step.output.widthPx,
        targetHeightPx: step.output.heightPx,
      });
    }
    return current;
  },
};

export const BUILTIN_NODES: readonly AnyNodeDefinition[] = [
  cameraRigNode,
  promptNode,
  renderNode,
  ladderNode,
];

/** Registry of the built-in nodes, keyed by type. */
export function builtinRegistry(): ReadonlyMap<string, AnyNodeDefinition> {
  return new Map(BUILTIN_NODES.map((n) => [n.type, n]));
}
