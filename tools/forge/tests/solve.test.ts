import { describe, expect, it } from "vitest";
import { compilePrompt } from "../src/optics/compile.js";
import { ShotError, solveShot, type ShotRequest } from "../src/optics/solve.js";

const base: ShotRequest = {
  subject: "a woman in a charcoal wool coat on a rain-slick street",
  camera: "eos_r5",
  lens: "canon_85_12",
  focalMm: 85,
  aperture: 1.2,
  subjectDistanceM: 2,
  // f/1.2 wide open needs a genuinely fast shutter to hold exposure, even
  // indoors. Metering: log2(1.2^2 * 2500) - log2(400/100) = EV100 9.8, which
  // sits inside the Rembrandt setup's 8-12 range.
  shutterSeconds: 1 / 2500,
  iso: 400,
  film: "portra_400",
  lighting: "rembrandt",
};

describe("solveShot", () => {
  it("solves a portrait and reports razor-thin focus", () => {
    const shot = solveShot(base);
    expect(shot.dof.totalMm).toBeGreaterThan(0);
    expect(shot.dof.totalMm).toBeLessThan(50);
    expect(shot.warnings).toHaveLength(0);
  });

  it("clamps an aperture the lens cannot reach, and says so", () => {
    const shot = solveShot({ ...base, aperture: 0.7 });
    expect(shot.request.aperture).toBe(1.2);
    expect(shot.warnings.join(" ")).toMatch(/opens to f\/1\.2/);
  });

  it("clamps ISO to the body's range", () => {
    const shot = solveShot({ ...base, iso: 200000 });
    expect(shot.request.iso).toBe(51200);
    expect(shot.warnings.join(" ")).toMatch(/tops out at ISO 51200/);
  });

  it("warns when a film stock is pushed off box speed", () => {
    const shot = solveShot({ ...base, iso: 1600 });
    expect(shot.warnings.join(" ")).toMatch(/pushed 2\.0 stops/);
  });

  it("rejects a focal length outside a prime's range", () => {
    expect(() => solveShot({ ...base, focalMm: 200 })).toThrow(ShotError);
  });

  it("rejects a background behind the camera side of the subject", () => {
    expect(() => solveShot({ ...base, backgroundDistanceM: 1 })).toThrow(ShotError);
  });

  it("passes exposure when the settings match the lighting setup", () => {
    const shot = solveShot(base);
    expect(shot.exposure.verdict).toBe("correct");
    expect(shot.exposure.stops).toBe(0);
    expect(shot.exposure.remedy).toBeNull();
  });

  it("flags shooting wide open in golden hour as overexposed, and suggests ND", () => {
    // f/1.2 at 1/160 ISO 400 meters for EV 5.8; golden hour runs EV 11-14.
    const shot = solveShot({ ...base, lighting: "golden_hour", shutterSeconds: 1 / 160 });
    expect(shot.exposure.verdict).toBe("overexposed");
    expect(shot.exposure.stops).toBeGreaterThan(4);
    // 5.2 stops over should reach for ND32 (5 stops), not the next size up.
    expect(shot.exposure.remedy).toMatch(/an ND32 filter/);
    expect(shot.warnings.join(" ")).toMatch(/stops overexposed/);
  });

  it("flags a stopped-down night shot as underexposed", () => {
    const shot = solveShot({
      ...base,
      lighting: "practical_neon",
      aperture: 16,
      shutterSeconds: 1 / 500,
      iso: 100,
    });
    expect(shot.exposure.verdict).toBe("underexposed");
    expect(shot.exposure.remedy).toMatch(/Open the aperture/);
  });

  it("tolerates a half-stop deviation without complaining", () => {
    // Rembrandt tops out at EV 12; metering EV 12.3 is inside tolerance.
    const shot = solveShot({ ...base, aperture: 1.4, shutterSeconds: 1 / 2500, iso: 100 });
    expect(shot.exposure.meteredEv100).toBeGreaterThan(12);
    expect(shot.exposure.verdict).toBe("correct");
  });

  it("widens the horizontal field of view for an anamorphic squeeze", () => {
    const spherical = solveShot({
      ...base,
      camera: "alexa35",
      lens: "zeiss_planar_50",
      focalMm: 50,
      aperture: 2.8,
      shutterSeconds: 1 / 50,
      iso: 800,
      film: "cinestill_800t",
      lighting: "hard_noir",
    });
    const anamorphic = solveShot({
      ...base,
      camera: "alexa35",
      lens: "panavision_anamorphic_50",
      focalMm: 50,
      aperture: 2.8,
      shutterSeconds: 1 / 50,
      iso: 800,
      film: "cinestill_800t",
      lighting: "hard_noir",
    });
    expect(anamorphic.fov.squeezeFactor).toBe(2);
    expect(anamorphic.fov.horizontalDeg).toBeGreaterThan(spherical.fov.horizontalDeg * 1.7);
    // Perspective compression follows the true focal length, so it is unchanged.
    expect(anamorphic.fov.equivalentFocalMm).toBe(spherical.fov.equivalentFocalMm);
    // Vertical angle is untouched by the squeeze.
    expect(anamorphic.fov.verticalDeg).toBeCloseTo(spherical.fov.verticalDeg, 6);
  });

  it("gives medium format shallower focus than full frame at equal framing", () => {
    const ff = solveShot({ ...base, camera: "eos_r5", lens: "canon_85_12", focalMm: 85, aperture: 2.8 });
    const mf = solveShot({
      ...base,
      camera: "gfx100_ii",
      lens: "nikon_105_macro",
      focalMm: 105,
      aperture: 2.8,
      iso: 400,
      film: "portra_400",
    });
    // Longer lens on the larger format at the same f-number and distance.
    expect(mf.dof.totalMm).toBeLessThan(ff.dof.totalMm);
  });
});

describe("compilePrompt", () => {
  it("leads with the subject and includes computed optics", () => {
    const compiled = compilePrompt(solveShot(base));
    expect(compiled.segments[0]?.role).toBe("subject");
    expect(compiled.prompt.startsWith(base.subject)).toBe(true);
    expect(compiled.prompt).toMatch(/depth of field/);
    expect(compiled.prompt).toMatch(/Canon EOS R5/);
    expect(compiled.prompt).toMatch(/Kodak Portra 400/);
  });

  it("does not contradict the named lighting setup with a metered light level", () => {
    const compiled = compilePrompt(solveShot({ ...base, lighting: "golden_hour" }));
    const lighting = compiled.segments.find((s) => s.role === "lighting")?.text ?? "";
    expect(lighting).toMatch(/Golden hour/);
    expect(lighting).not.toMatch(/interior light|near-darkness|sunlight/);
  });

  it("keeps the described scene stable when only the aperture changes", () => {
    const wide = compilePrompt(solveShot({ ...base, aperture: 1.2 }));
    const stopped = compilePrompt(solveShot({ ...base, aperture: 11 }));
    const lightingOf = (c: typeof wide) => c.segments.find((s) => s.role === "lighting")?.text;
    expect(lightingOf(wide)).toBe(lightingOf(stopped));
  });

  it("changes the optical clause when only aperture changes", () => {
    const wide = compilePrompt(solveShot({ ...base, aperture: 1.2 }));
    const stopped = compilePrompt(solveShot({ ...base, aperture: 11 }));
    const opticsOf = (c: typeof wide) => c.segments.find((s) => s.role === "optics")?.text;
    expect(opticsOf(wide)).not.toBe(opticsOf(stopped));
  });

  it("appends free-text notes last", () => {
    const compiled = compilePrompt(solveShot({ ...base, notes: "shot from a low angle" }));
    expect(compiled.segments.at(-1)).toEqual({ role: "notes", text: "shot from a low angle" });
  });
});
