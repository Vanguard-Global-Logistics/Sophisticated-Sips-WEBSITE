import { describe, expect, it } from "vitest";
import {
  backgroundBlurMm,
  depthOfField,
  entrancePupilMm,
  exposureValue,
  fieldOfView,
  hyperfocalMm,
} from "../src/optics/physics.js";
import { SENSORS } from "../src/optics/sensors.js";

const FF = SENSORS.full_frame;

describe("hyperfocal", () => {
  it("matches the closed form for 50mm f/1.4 on full frame", () => {
    // H = 50^2 / (1.4 * 0.029) + 50
    expect(hyperfocalMm(50, 1.4, FF.cocMm)).toBeCloseTo(61626.35, 0);
  });

  it("shrinks as the lens is stopped down", () => {
    expect(hyperfocalMm(50, 16, FF.cocMm)).toBeLessThan(hyperfocalMm(50, 1.4, FF.cocMm));
  });
});

describe("depthOfField", () => {
  it("reproduces published figures for 50mm f/1.4 at 2m, full frame", () => {
    const dof = depthOfField(50, 1.4, 2000, FF.cocMm);
    // DOF tables give ~1.94m near, ~2.07m far, ~13cm total.
    expect(dof.nearMm).toBeCloseTo(1938.6, 0);
    expect(dof.farMm).toBeCloseTo(2065.4, 0);
    expect(dof.totalMm).toBeCloseTo(126.8, 0);
    expect(dof.infiniteFar).toBe(false);
  });

  it("returns an unbounded far limit at or past hyperfocal", () => {
    const H = hyperfocalMm(35, 8, FF.cocMm);
    const dof = depthOfField(35, 8, H + 1, FF.cocMm);
    expect(dof.infiniteFar).toBe(true);
    expect(dof.farMm).toBe(Infinity);
    expect(dof.totalMm).toBe(Infinity);
  });

  it("gives a smaller-format sensor deeper focus at equivalent framing", () => {
    // Same angle of view: 50mm on full frame vs 25mm on MFT, both at 2m.
    const ff = depthOfField(50, 2.8, 2000, SENSORS.full_frame.cocMm);
    const mft = depthOfField(25, 2.8, 2000, SENSORS.micro_four_thirds.cocMm);
    expect(mft.totalMm).toBeGreaterThan(ff.totalMm);
  });

  it("rejects a subject closer than the focal length", () => {
    expect(() => depthOfField(50, 1.4, 40, FF.cocMm)).toThrow(RangeError);
  });

  it("rejects non-positive inputs", () => {
    expect(() => depthOfField(50, 0, 2000, FF.cocMm)).toThrow(RangeError);
    expect(() => depthOfField(-50, 1.4, 2000, FF.cocMm)).toThrow(RangeError);
  });
});

describe("fieldOfView", () => {
  it("matches the standard 50mm full-frame angles", () => {
    const fov = fieldOfView(50, FF);
    expect(fov.horizontalDeg).toBeCloseTo(39.6, 1);
    expect(fov.verticalDeg).toBeCloseTo(27.0, 1);
    expect(fov.diagonalDeg).toBeCloseTo(46.8, 1);
    expect(fov.equivalentFocalMm).toBe(50);
  });

  it("applies the crop factor to equivalent focal length", () => {
    expect(fieldOfView(25, SENSORS.micro_four_thirds).equivalentFocalMm).toBe(50);
  });
});

describe("exposureValue", () => {
  it("puts sunny-16 at EV 15", () => {
    expect(exposureValue(16, 1 / 125, 100)).toBeCloseTo(15, 1);
  });

  it("drops one EV per stop of ISO gain", () => {
    const base = exposureValue(5.6, 1 / 60, 100);
    expect(exposureValue(5.6, 1 / 60, 200)).toBeCloseTo(base - 1, 6);
  });
});

describe("backgroundBlurMm", () => {
  it("grows with the square of focal length", () => {
    const at50 = backgroundBlurMm(50, 2, 2000, 10000);
    const at100 = backgroundBlurMm(100, 2, 2000, 10000);
    expect(at100 / at50).toBeCloseTo(4, 5);
  });

  it("is zero when the background sits on the focal plane", () => {
    expect(backgroundBlurMm(85, 1.4, 2000, 2000)).toBe(0);
  });
});

describe("entrancePupilMm", () => {
  it("is focal length over f-number", () => {
    expect(entrancePupilMm(85, 1.4)).toBeCloseTo(60.71, 2);
  });
});
