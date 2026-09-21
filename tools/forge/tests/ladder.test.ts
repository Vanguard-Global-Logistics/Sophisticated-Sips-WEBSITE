import { describe, expect, it } from "vitest";
import {
  dimensionsFor,
  parseAspectRatio,
  planLadder,
  RESOLUTION_TARGETS,
} from "../src/render/ladder.js";

describe("parseAspectRatio", () => {
  it("parses a ratio", () => {
    expect(parseAspectRatio("16:9")).toEqual({ w: 16, h: 9 });
  });
  it("rejects nonsense", () => {
    expect(() => parseAspectRatio("wide")).toThrow(RangeError);
    expect(() => parseAspectRatio("16:0")).toThrow(RangeError);
  });
});

describe("dimensionsFor", () => {
  it("puts the target on the long edge in landscape", () => {
    expect(dimensionsFor("8k", "16:9")).toEqual({ widthPx: 7680, heightPx: 4320 });
  });
  it("puts the target on the long edge in portrait", () => {
    expect(dimensionsFor("8k", "9:16")).toEqual({ widthPx: 4320, heightPx: 7680 });
  });
  it("handles a square", () => {
    expect(dimensionsFor("4k", "1:1")).toEqual({ widthPx: 4096, heightPx: 4096 });
  });
  it("always returns even dimensions", () => {
    for (const ratio of ["21:9", "3:2", "4:5", "2:3"]) {
      const d = dimensionsFor("8k", ratio);
      expect(d.widthPx % 2).toBe(0);
      expect(d.heightPx % 2).toBe(0);
    }
  });
});

describe("planLadder", () => {
  it("needs no upscale when the model reaches the target natively", () => {
    const plan = planLadder({ target: "4k", aspectRatio: "16:9", model: "gpt_image_2_5" });
    expect(plan.nativeOnly).toBe(true);
    expect(plan.steps).toHaveLength(1);
    expect(plan.steps[0]?.kind).toBe("generate");
  });

  it("reaches 8K from the highest-ceiling model in one upscale step", () => {
    const plan = planLadder({ target: "8k", aspectRatio: "16:9" });
    expect(plan.base.model).toBe("seedream_v4_5");
    expect(plan.nativeOnly).toBe(false);
    const last = plan.steps.at(-1)!;
    expect(last.output).toEqual({ widthPx: 7680, heightPx: 4320 });
  });

  it("lands exactly on the target, whatever the route", () => {
    for (const model of ["seedream_v4_5", "gpt_image_2_5", "soul_cinematic"]) {
      for (const ratio of ["16:9", "9:16", "1:1", "21:9"]) {
        const plan = planLadder({ target: "8k", aspectRatio: ratio, model });
        expect(plan.steps.at(-1)!.output).toEqual(dimensionsFor("8k", ratio));
      }
    }
  });

  it("takes 2K to 8K in a single step, since 3.75x is within the limit", () => {
    const plan = planLadder({ target: "8k", aspectRatio: "16:9", model: "soul_cinematic" });
    const upscales = plan.steps.filter((s) => s.kind === "upscale");
    expect(upscales).toHaveLength(1);
    expect(upscales[0]?.scaleFactor).toBeCloseTo(7680 / 2048, 3);
  });

  it("splits a climb that would exceed 4x into even steps", () => {
    // 2048 -> 16384 is 8x, so it must become two ~2.83x steps.
    const plan = planLadder({ target: 16384, aspectRatio: "16:9", model: "soul_cinematic" });
    const upscales = plan.steps.filter((s) => s.kind === "upscale");
    expect(upscales).toHaveLength(2);
    for (const step of upscales) {
      expect(step.scaleFactor).toBeLessThanOrEqual(4.0001);
      expect(step.scaleFactor).toBeCloseTo(Math.sqrt(8), 1);
    }
    expect(upscales.at(-1)?.output.widthPx).toBe(16384);
  });

  it("never exceeds the per-step limit on any supported route", () => {
    for (const model of ["seedream_v4_5", "gpt_image_2_5", "soul_cinematic"]) {
      for (const target of [4096, 7680, 12000, 16384]) {
        for (const step of planLadder({ target, aspectRatio: "16:9", model }).steps) {
          expect(step.scaleFactor).toBeLessThanOrEqual(4.0001);
        }
      }
    }
  });

  it("keeps numeric provider params numeric, since Topaz rejects strings", () => {
    const plan = planLadder({ target: "8k", aspectRatio: "16:9" });
    const upscale = plan.steps.find((s) => s.kind === "upscale")!;
    expect(typeof upscale.params.output_width).toBe("number");
    expect(typeof upscale.params.output_height).toBe("number");
    expect(upscale.params.output_width).toBe(7680);
  });

  it("renders the base as large as the model natively allows", () => {
    const plan = planLadder({ target: "8k", aspectRatio: "16:9", model: "gpt_image_2_5" });
    expect(plan.steps[0]?.output.widthPx).toBe(4096);
    expect(plan.steps[0]?.params).toEqual({ resolution: "4k", quality: "high" });
  });

  it("does not render larger than the target when the target is small", () => {
    const plan = planLadder({ target: "1k", aspectRatio: "16:9", model: "seedream_v4_5" });
    expect(plan.steps[0]?.output.widthPx).toBe(RESOLUTION_TARGETS["1k"]);
    expect(plan.nativeOnly).toBe(true);
  });

  it("warns that beyond 4K the pixels come from the upscaler", () => {
    const plan = planLadder({ target: "8k", aspectRatio: "16:9" });
    expect(plan.notes.join(" ")).toMatch(/come from the upscaler/);
  });

  it("refuses an unknown base model rather than silently substituting", () => {
    expect(() => planLadder({ target: "4k", aspectRatio: "16:9", model: "nope" })).toThrow(
      RangeError,
    );
  });
});
