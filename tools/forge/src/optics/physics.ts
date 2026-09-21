/**
 * Thin-lens photographic maths.
 *
 * These are the standard closed-form results, not approximations invented for
 * this codebase. Every figure the prompt compiler states about a shot comes
 * from here, so a described look is a computed one.
 *
 * Symbols: f = focal length (mm), N = f-number, s = subject distance (mm),
 * c = circle of confusion (mm).
 */
import type { SensorFormat } from "./sensors.js";

/** Hyperfocal distance H = f^2 / (N * c) + f, in millimetres. */
export function hyperfocalMm(focalMm: number, fNumber: number, cocMm: number): number {
  assertPositive({ focalMm, fNumber, cocMm });
  return (focalMm * focalMm) / (fNumber * cocMm) + focalMm;
}

export interface DepthOfField {
  /** Nearest sharp plane, millimetres from the sensor. */
  readonly nearMm: number;
  /** Farthest sharp plane, millimetres. `Infinity` once focus reaches hyperfocal. */
  readonly farMm: number;
  /** farMm - nearMm. `Infinity` when the far limit is unbounded. */
  readonly totalMm: number;
  readonly hyperfocalMm: number;
  /** True when the far limit is unbounded (subject at or beyond hyperfocal). */
  readonly infiniteFar: boolean;
}

/**
 * Depth of field for a lens focused at `subjectMm`.
 *
 * near = s(H - f) / (H + s - 2f)
 * far  = s(H - f) / (H - s)      -> unbounded when s >= H
 */
export function depthOfField(
  focalMm: number,
  fNumber: number,
  subjectMm: number,
  cocMm: number,
): DepthOfField {
  assertPositive({ focalMm, fNumber, subjectMm, cocMm });
  if (subjectMm <= focalMm) {
    throw new RangeError(
      `subject distance (${subjectMm}mm) must exceed focal length (${focalMm}mm); ` +
        `the thin-lens model has no real image inside the focal plane`,
    );
  }

  const H = hyperfocalMm(focalMm, fNumber, cocMm);
  const near = (subjectMm * (H - focalMm)) / (H + subjectMm - 2 * focalMm);

  // At or beyond hyperfocal the far limit runs to infinity; the closed form
  // divides by a non-positive number there, so branch rather than emit a
  // negative "distance".
  const infiniteFar = subjectMm >= H;
  const far = infiniteFar ? Infinity : (subjectMm * (H - focalMm)) / (H - subjectMm);

  return {
    nearMm: near,
    farMm: far,
    totalMm: infiniteFar ? Infinity : far - near,
    hyperfocalMm: H,
    infiniteFar,
  };
}

export interface FieldOfView {
  /** Horizontal angle of view, degrees. */
  readonly horizontalDeg: number;
  readonly verticalDeg: number;
  readonly diagonalDeg: number;
  /**
   * Full-frame-equivalent focal length, millimetres. For an anamorphic lens
   * this stays the true focal length times the crop factor, because perspective
   * compression follows the actual focal length — the squeeze widens the frame
   * without flattening the subject. That asymmetry is the anamorphic look.
   */
  readonly equivalentFocalMm: number;
  /** Horizontal squeeze applied, 1 for a spherical lens. */
  readonly squeezeFactor: number;
}

/**
 * Angle of view: theta = 2 * atan(dimension / 2f).
 *
 * `squeezeFactor` models an anamorphic lens, which optically compresses a wider
 * horizontal angle onto the same sensor width. A 2x squeeze therefore sees the
 * horizontal angle of a spherical lens of half the focal length.
 */
export function fieldOfView(
  focalMm: number,
  sensor: SensorFormat,
  squeezeFactor = 1,
): FieldOfView {
  assertPositive({ focalMm, squeezeFactor });
  const angle = (dimMm: number) => 2 * Math.atan(dimMm / (2 * focalMm)) * (180 / Math.PI);
  const effectiveWidthMm = sensor.widthMm * squeezeFactor;
  const diagonalMm = Math.hypot(effectiveWidthMm, sensor.heightMm);
  return {
    horizontalDeg: angle(effectiveWidthMm),
    verticalDeg: angle(sensor.heightMm),
    diagonalDeg: angle(diagonalMm),
    equivalentFocalMm: focalMm * sensor.cropFactor,
    squeezeFactor,
  };
}

/**
 * Exposure value at ISO 100: EV100 = log2(N^2 / t) - log2(ISO / 100).
 * `shutterSeconds` is t. Returns the scene EV the settings meter for.
 */
export function exposureValue(fNumber: number, shutterSeconds: number, iso: number): number {
  assertPositive({ fNumber, shutterSeconds, iso });
  return Math.log2((fNumber * fNumber) / shutterSeconds) - Math.log2(iso / 100);
}

/**
 * Diameter of the defocus circle cast by a point at `backgroundMm` when focus
 * sits at `subjectMm`, in millimetres on the sensor. This is the honest measure
 * of "how much bokeh" — it scales with f^2/N, which is why a fast long lens
 * separates a subject far harder than a fast wide one at the same f-number.
 *
 * blur = (f^2 / (N * s)) * |b - s| / b
 */
export function backgroundBlurMm(
  focalMm: number,
  fNumber: number,
  subjectMm: number,
  backgroundMm: number,
): number {
  assertPositive({ focalMm, fNumber, subjectMm, backgroundMm });
  const magnitude = Math.abs(backgroundMm - subjectMm) / backgroundMm;
  return ((focalMm * focalMm) / (fNumber * subjectMm)) * magnitude;
}

/** Entrance pupil diameter, millimetres: f / N. */
export function entrancePupilMm(focalMm: number, fNumber: number): number {
  assertPositive({ focalMm, fNumber });
  return focalMm / fNumber;
}

function assertPositive(values: Record<string, number>): void {
  for (const [name, value] of Object.entries(values)) {
    if (!Number.isFinite(value) || value <= 0) {
      throw new RangeError(`${name} must be a finite positive number, received ${value}`);
    }
  }
}
