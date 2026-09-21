#!/usr/bin/env node
/**
 * Forge as an MCP server.
 *
 * The engine is agent-drivable rather than click-only: an assistant can solve a
 * shot, inspect the optics it implies, plan a route to the target resolution,
 * and receive the exact provider calls to execute -- without any of that logic
 * living in the assistant's head, where it would drift between sessions.
 *
 * Nothing here spends money. The server plans and validates; execution is the
 * caller's to run against whichever provider they hold credentials for.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

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
import { getSensor } from "../optics/sensors.js";
import { compilePrompt } from "../optics/compile.js";
import { ShotError, solveShot } from "../optics/solve.js";
import { MODEL_CAPABILITIES, planLadder, type ResolutionTarget } from "../render/ladder.js";

const server = new McpServer({ name: "forge", version: "0.1.0" });

const json = (value: unknown) => ({
  content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }],
});

const fail = (message: string) => ({
  content: [{ type: "text" as const, text: message }],
  isError: true,
});

server.registerTool(
  "forge_catalog",
  {
    title: "List the optics catalogue",
    description:
      "Every camera body, lens, film stock and lighting setup Forge knows, with the " +
      "physical constants behind each. Call this before composing a shot so that ids " +
      "are chosen from what exists rather than invented.",
    inputSchema: {},
  },
  async () =>
    json({
      cameras: Object.values(CAMERAS).map((c) => ({
        id: c.id,
        label: c.label,
        sensor: getSensor(c.sensor),
        isoRange: c.isoRange,
      })),
      lenses: Object.values(LENSES).map((l) => ({
        id: l.id,
        label: l.label,
        focalRangeMm: l.focalRangeMm,
        apertureRange: l.apertureRange,
        squeezeFactor: "squeezeFactor" in l ? l.squeezeFactor : 1,
      })),
      filmStocks: Object.values(FILM_STOCKS).map((f) => ({
        id: f.id,
        label: f.label,
        boxIso: f.boxIso,
      })),
      lighting: Object.values(LIGHTING).map((s) => ({
        id: s.id,
        label: s.label,
        nominalEv100: s.nominalEv100,
      })),
    }),
);

const shotShape = {
  subject: z.string().min(1).describe("What the picture is of."),
  camera: z.string().describe("Camera body id from forge_catalog."),
  lens: z.string().describe("Lens id from forge_catalog."),
  focalMm: z.number().positive().describe("Focal length in millimetres."),
  aperture: z.number().positive().describe("f-number, e.g. 1.4."),
  subjectDistanceM: z.number().positive().describe("Distance to the focal plane, metres."),
  backgroundDistanceM: z
    .number()
    .positive()
    .optional()
    .describe("Distance to the main background, metres. Defaults to 4x the subject distance."),
  shutterSeconds: z.number().positive().describe("Shutter time in seconds, e.g. 0.004 for 1/250."),
  iso: z.number().positive().describe("Sensor or film speed."),
  film: z.string().describe("Film stock id from forge_catalog."),
  lighting: z.string().describe("Lighting setup id from forge_catalog."),
  notes: z.string().optional().describe("Extra art direction appended verbatim."),
};

type ShotArgs = { [K in keyof typeof shotShape]: z.infer<(typeof shotShape)[K]> };

function solveAndCompile(args: ShotArgs) {
  const shot = solveShot({
    subject: args.subject,
    camera: args.camera as CameraId,
    lens: args.lens as LensId,
    focalMm: args.focalMm,
    aperture: args.aperture,
    subjectDistanceM: args.subjectDistanceM,
    shutterSeconds: args.shutterSeconds,
    iso: args.iso,
    film: args.film as FilmStockId,
    lighting: args.lighting as LightingId,
    ...(args.backgroundDistanceM !== undefined
      ? { backgroundDistanceM: args.backgroundDistanceM }
      : {}),
    ...(args.notes !== undefined ? { notes: args.notes } : {}),
  });
  return { shot, compiled: compilePrompt(shot) };
}

function summarise(shot: ReturnType<typeof solveAndCompile>["shot"]) {
  return {
    depthOfField: {
      nearM: round(shot.dof.nearMm / 1000),
      farM: shot.dof.infiniteFar ? "infinity" : round(shot.dof.farMm / 1000),
      totalCm: shot.dof.infiniteFar ? "infinite" : round(shot.dof.totalMm / 10),
      hyperfocalM: round(shot.dof.hyperfocalMm / 1000),
    },
    fieldOfView: {
      horizontalDeg: round(shot.fov.horizontalDeg),
      verticalDeg: round(shot.fov.verticalDeg),
      equivalentFocalMm: round(shot.fov.equivalentFocalMm),
      squeezeFactor: shot.fov.squeezeFactor,
    },
    exposure: {
      meteredEv100: round(shot.ev100),
      sceneEv100Range: shot.exposure.sceneEv100Range,
      verdict: shot.exposure.verdict,
      stopsOff: round(shot.exposure.stops),
      remedy: shot.exposure.remedy,
    },
    backgroundBlurMm: round(shot.backgroundBlurMm, 3),
    entrancePupilMm: round(shot.entrancePupilMm, 1),
  };
}

const round = (n: number, dp = 2) => Number(n.toFixed(dp));

server.registerTool(
  "forge_solve_shot",
  {
    title: "Solve a shot and compile its prompt",
    description:
      "Validate a camera setup against what the chosen body and lens can physically do, " +
      "compute depth of field, field of view and exposure, and compile a prompt that " +
      "describes the computed result. Reports clamped settings and exposure errors " +
      "(for instance shooting wide open in daylight) before anything is rendered.",
    inputSchema: shotShape,
  },
  async (args) => {
    try {
      const { shot, compiled } = solveAndCompile(args as ShotArgs);
      return json({
        prompt: compiled.prompt,
        negativePrompt: compiled.negative,
        segments: compiled.segments,
        optics: summarise(shot),
        warnings: shot.warnings,
      });
    } catch (error) {
      if (error instanceof ShotError || error instanceof RangeError) return fail(error.message);
      throw error;
    }
  },
);

server.registerTool(
  "forge_plan_ladder",
  {
    title: "Plan a route to a target resolution",
    description:
      "No model renders 8K in one pass. Given a target and aspect ratio, return the base " +
      "model to render at its native ceiling and the upscale steps that carry it the rest " +
      "of the way, each within a 4x linear jump.",
    inputSchema: {
      target: z
        .union([z.enum(["1k", "2k", "4k", "6k", "8k"]), z.number().int().positive()])
        .describe("Target longest edge: a named tier, or a pixel count."),
      aspectRatio: z.string().describe('Aspect ratio such as "16:9" or "4:5".'),
      model: z.string().optional().describe("Force a base model; otherwise the tallest ceiling wins."),
      upscaler: z.string().optional().describe("Upscaler model id for the climb steps."),
    },
  },
  async ({ target, aspectRatio, model, upscaler }) => {
    try {
      const plan = planLadder({
        target: target as ResolutionTarget | number,
        aspectRatio,
        ...(model !== undefined ? { model } : {}),
        ...(upscaler !== undefined ? { upscaler } : {}),
      });
      return json({
        target: plan.target,
        baseModel: { id: plan.base.model, label: plan.base.label, notes: plan.base.notes },
        nativeOnly: plan.nativeOnly,
        steps: plan.steps,
        notes: plan.notes,
        availableModels: MODEL_CAPABILITIES.map((m) => ({
          id: m.model,
          label: m.label,
          nativeMaxEdgePx: m.nativeMaxEdgePx,
        })),
      });
    } catch (error) {
      if (error instanceof RangeError) return fail(error.message);
      throw error;
    }
  },
);

server.registerTool(
  "forge_plan_render",
  {
    title: "Plan a complete render",
    description:
      "Solve the shot, compile the prompt and plan the resolution ladder in one call, then " +
      "emit the provider calls that would execute it. Nothing is spent: the caller runs the " +
      "returned calls against whichever provider they hold credentials for. Preflight each " +
      "with the provider's own cost estimate before executing.",
    inputSchema: {
      ...shotShape,
      target: z
        .union([z.enum(["1k", "2k", "4k", "6k", "8k"]), z.number().int().positive()])
        .describe("Target longest edge."),
      aspectRatio: z.string().describe('Aspect ratio such as "16:9".'),
      model: z.string().optional().describe("Force a base model."),
      seed: z.number().int().optional().describe("Seed, for a reproducible base render."),
    },
  },
  async (args) => {
    try {
      const { shot, compiled } = solveAndCompile(args as unknown as ShotArgs);
      const plan = planLadder({
        target: args.target as ResolutionTarget | number,
        aspectRatio: args.aspectRatio,
        ...(args.model !== undefined ? { model: args.model } : {}),
      });

      const calls = plan.steps.map((step, index) =>
        step.kind === "generate"
          ? {
              order: index,
              tool: "generate_image",
              params: {
                model: step.model,
                prompt: compiled.prompt,
                aspect_ratio: args.aspectRatio,
                ...step.params,
                ...(args.seed !== undefined ? { seed: args.seed } : {}),
                get_cost: true,
              },
              note: "Run with get_cost:true first, then again without it to execute.",
            }
          : {
              order: index,
              tool: "generate_image",
              params: {
                model: step.model,
                ...step.params,
                medias: [{ role: "image_references", value: "<job_id of the previous step>" }],
                get_cost: true,
              },
              note:
                `Climbs to ${step.output.widthPx}x${step.output.heightPx} ` +
                `(${step.scaleFactor.toFixed(2)}x). Substitute the previous step's job id.`,
            },
      );

      return json({
        prompt: compiled.prompt,
        negativePrompt: compiled.negative,
        optics: summarise(shot),
        warnings: shot.warnings,
        target: plan.target,
        ladderNotes: plan.notes,
        providerCalls: calls,
      });
    } catch (error) {
      if (error instanceof ShotError || error instanceof RangeError) return fail(error.message);
      throw error;
    }
  },
);

async function main(): Promise<void> {
  await server.connect(new StdioServerTransport());
}

main().catch((error: unknown) => {
  process.stderr.write(`forge mcp server failed to start: ${String(error)}\n`);
  process.exitCode = 1;
});
