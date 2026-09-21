/**
 * The shot solver.
 *
 * Takes a requested camera setup, validates it against what the chosen body and
 * lens can physically do, runs the optics, and returns both the numbers and the
 * English that describes them.
 *
 * The important design choice: the compiled prompt describes the *computed
 * result* ("a razor-thin 12.7cm plane of focus"), not the settings that produced
 * it ("f/1.4"). Image models have no optical simulator — they only know what
 * pictures described a certain way look like. Handing them the outcome lands the
 * look far more reliably than handing them the dial positions.
 */
import {
  CAMERAS,
  FILM_STOCKS,
  LENSES,
  LIGHTING,
  type CameraId,
  type FilmStockId,
  type LensId,
  type LightingId,
} from "./catalog.js";
import {
  backgroundBlurMm,
  depthOfField,
  entrancePupilMm,
  exposureValue,
  fieldOfView,
  type DepthOfField,
  type FieldOfView,
} from "./physics.js";
import { getSensor } from "./sensors.js";

export interface ShotRequest {
  /** What the picture is of. Free text — the only un-modelled field. */
  readonly subject: string;
  readonly camera: CameraId;
  readonly lens: LensId;
  readonly focalMm: number;
  readonly aperture: number;
  /** Distance to the focal plane, metres. */
  readonly subjectDistanceM: number;
  /** Distance to the principal background, metres. Defaults to 4x subject distance. */
  readonly backgroundDistanceM?: number;
  readonly shutterSeconds: number;
  readonly iso: number;
  readonly film: FilmStockId;
  readonly lighting: LightingId;
  /** Extra art direction appended verbatim after the optical description. */
  readonly notes?: string;
}

export interface SolvedShot {
  readonly request: ShotRequest;
  readonly dof: DepthOfField;
  readonly fov: FieldOfView;
  readonly ev100: number;
  readonly entrancePupilMm: number;
  readonly backgroundBlurMm: number;
  readonly exposure: ExposureVerdict;
  /** Non-fatal corrections the solver applied, in plain English. */
  readonly warnings: readonly string[];
}

/**
 * How the requested settings sit against the light the chosen setup actually
 * puts out. `stops` is positive when the frame would be overexposed.
 */
export interface ExposureVerdict {
  readonly meteredEv100: number;
  readonly sceneEv100Range: readonly [number, number];
  readonly stops: number;
  readonly verdict: "correct" | "overexposed" | "underexposed";
  /** Suggested remedy when the shot is off, e.g. an ND filter. */
  readonly remedy: string | null;
}

/**
 * Validate and solve. Throws `ShotError` on a request the hardware cannot
 * express; clamps and warns on one it can only approximate.
 */
export class ShotError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ShotError";
  }
}

export function solveShot(request: ShotRequest): SolvedShot {
  const warnings: string[] = [];
  const camera = CAMERAS[request.camera];
  const lens = LENSES[request.lens];
  if (!camera) throw new ShotError(`unknown camera "${request.camera}"`);
  if (!lens) throw new ShotError(`unknown lens "${request.lens}"`);
  if (!FILM_STOCKS[request.film]) throw new ShotError(`unknown film stock "${request.film}"`);
  if (!LIGHTING[request.lighting]) throw new ShotError(`unknown lighting "${request.lighting}"`);

  const [minFocal, maxFocal] = lens.focalRangeMm;
  if (request.focalMm < minFocal || request.focalMm > maxFocal) {
    throw new ShotError(
      `${lens.label} covers ${minFocal}-${maxFocal}mm; ${request.focalMm}mm is outside it`,
    );
  }

  const [wideOpen, stoppedDown] = lens.apertureRange;
  let aperture = request.aperture;
  if (aperture < wideOpen) {
    warnings.push(
      `${lens.label} opens to f/${wideOpen}; f/${request.aperture} clamped to f/${wideOpen}`,
    );
    aperture = wideOpen;
  } else if (aperture > stoppedDown) {
    warnings.push(
      `${lens.label} stops to f/${stoppedDown}; f/${request.aperture} clamped to f/${stoppedDown}`,
    );
    aperture = stoppedDown;
  }

  const [minIso, maxIso] = camera.isoRange;
  let iso = request.iso;
  if (iso < minIso) {
    warnings.push(`${camera.label} bottoms out at ISO ${minIso}; ISO ${request.iso} clamped`);
    iso = minIso;
  } else if (iso > maxIso) {
    warnings.push(`${camera.label} tops out at ISO ${maxIso}; ISO ${request.iso} clamped`);
    iso = maxIso;
  }

  const film = FILM_STOCKS[request.film];
  if (film.boxIso !== iso && request.film !== "digital_clean") {
    const stops = Math.log2(iso / film.boxIso);
    if (Math.abs(stops) >= 1) {
      const direction = stops > 0 ? "pushed" : "pulled";
      warnings.push(
        `${film.label} is ISO ${film.boxIso}; shooting at ISO ${iso} is ${direction} ` +
          `${Math.abs(stops).toFixed(1)} stops and will shift grain and contrast`,
      );
    }
  }

  if (request.subjectDistanceM <= 0) {
    throw new ShotError(`subject distance must be positive, received ${request.subjectDistanceM}m`);
  }

  const subjectMm = request.subjectDistanceM * 1000;
  const backgroundMm = (request.backgroundDistanceM ?? request.subjectDistanceM * 4) * 1000;
  if (backgroundMm < subjectMm) {
    throw new ShotError(
      `background (${backgroundMm / 1000}m) sits in front of the subject (${subjectMm / 1000}m)`,
    );
  }

  const sensor = getSensor(camera.sensor);
  const dof = depthOfField(request.focalMm, aperture, subjectMm, sensor.cocMm);
  // `satisfies` keeps each lens's literal type, so spherical lenses genuinely
  // lack the key rather than holding undefined; narrow with `in` before reading.
  const squeeze = "squeezeFactor" in lens ? (lens.squeezeFactor ?? 1) : 1;
  const fov = fieldOfView(request.focalMm, sensor, squeeze);

  const ev100 = exposureValue(aperture, request.shutterSeconds, iso);
  const exposure = judgeExposure(ev100, LIGHTING[request.lighting].nominalEv100);
  if (exposure.verdict !== "correct") {
    warnings.push(
      `these settings meter for EV ${ev100.toFixed(1)}, but ${LIGHTING[request.lighting].label} ` +
        `runs about EV ${exposure.sceneEv100Range[0]}-${exposure.sceneEv100Range[1]}: ` +
        `${Math.abs(exposure.stops).toFixed(1)} stops ${exposure.verdict}` +
        (exposure.remedy ? `. ${exposure.remedy}` : ""),
    );
  }

  return {
    request: { ...request, aperture, iso },
    dof,
    fov,
    ev100,
    entrancePupilMm: entrancePupilMm(request.focalMm, aperture),
    backgroundBlurMm: backgroundBlurMm(request.focalMm, aperture, subjectMm, backgroundMm),
    exposure,
    warnings,
  };
}

/**
 * Compare metered EV against what the lighting setup plausibly emits.
 *
 * A half-stop slop is ignored; real scenes are not that precise. Beyond that we
 * say which way the frame is off and name the fix a photographer would reach
 * for, since the usual cause is wanting a wide aperture in bright light.
 */
function judgeExposure(
  meteredEv100: number,
  sceneEv100Range: readonly [number, number],
): ExposureVerdict {
  const [low, high] = sceneEv100Range;
  const TOLERANCE_STOPS = 0.5;

  // Metering for a HIGHER EV than the scene provides means the settings are set
  // up for brighter light than there is, so the frame comes out dark.
  let stops = 0;
  if (meteredEv100 > high + TOLERANCE_STOPS) stops = -(meteredEv100 - high);
  else if (meteredEv100 < low - TOLERANCE_STOPS) stops = low - meteredEv100;

  if (stops === 0) {
    return { meteredEv100, sceneEv100Range, stops: 0, verdict: "correct", remedy: null };
  }

  const overexposed = stops > 0;
  return {
    meteredEv100,
    sceneEv100Range,
    stops,
    verdict: overexposed ? "overexposed" : "underexposed",
    remedy: overexposed
      ? `Fit roughly an ${ndFilterFor(stops)} filter, or raise the shutter speed, to keep this aperture`
      : "Open the aperture, slow the shutter, or raise ISO to hold this exposure",
  };
}

/**
 * Nearest commonly sold ND strength for a given number of stops to lose.
 * ND32 (5 stops) belongs here: leaving it out rounded a 5.2-stop overexposure
 * up to ND64, which is a stop further than needed.
 */
function ndFilterFor(stops: number): string {
  const common = [1, 2, 3, 4, 5, 6, 10];
  const nearest = common.reduce((best, n) =>
    Math.abs(n - stops) < Math.abs(best - stops) ? n : best,
  );
  return `ND${2 ** nearest}`;
}

/** Plain-English band for a depth of field, given its total extent. */
export function describeDepthOfField(dof: DepthOfField): string {
  if (dof.infiniteFar) return "deep focus running to infinity, everything sharp";
  const mm = dof.totalMm;
  if (mm < 10) return `a microscopically thin ${mm.toFixed(1)}mm plane of focus`;
  if (mm < 50) return `a razor-thin ${(mm / 10).toFixed(1)}cm depth of field`;
  if (mm < 200) return `a very shallow ${(mm / 10).toFixed(1)}cm depth of field`;
  if (mm < 1000) return `a shallow ${(mm / 10).toFixed(0)}cm depth of field`;
  if (mm < 5000) return `a moderate ${(mm / 1000).toFixed(1)}m depth of field`;
  return `a deep ${(mm / 1000).toFixed(1)}m depth of field`;
}

/** Plain-English band for background separation, given the defocus circle. */
export function describeBackgroundBlur(blurMm: number, cocMm: number): string {
  const ratio = blurMm / cocMm;
  if (ratio < 1) return "a background essentially still in focus";
  if (ratio < 4) return "a gently softened background";
  if (ratio < 12) return "a clearly separated, smoothly defocused background";
  if (ratio < 40) return "a background melted into soft wash";
  return "a background dissolved into pure blurred colour";
}

/** Plain-English band for perspective, given full-frame-equivalent focal length. */
export function describePerspective(equivalentFocalMm: number): string {
  if (equivalentFocalMm < 20) return "ultra-wide perspective with pronounced depth stretch";
  if (equivalentFocalMm < 35) return "wide-angle perspective with expanded foreground";
  if (equivalentFocalMm < 60) return "natural normal-lens perspective";
  if (equivalentFocalMm < 105) return "short-telephoto portrait compression";
  if (equivalentFocalMm < 200) return "telephoto compression, flattened planes";
  return "extreme telephoto compression, stacked planes";
}

/** Plain-English band for ambient light level, given EV at ISO 100. */
export function describeLightLevel(ev100: number): string {
  if (ev100 >= 15) return "full direct sunlight";
  if (ev100 >= 13) return "bright daylight";
  if (ev100 >= 11) return "open shade or bright overcast";
  if (ev100 >= 8) return "dim daylight or bright interior";
  if (ev100 >= 5) return "low interior light";
  if (ev100 >= 2) return "deep dusk";
  return "near-darkness, night exposure";
}
