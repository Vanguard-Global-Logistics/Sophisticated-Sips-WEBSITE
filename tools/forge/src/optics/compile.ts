/**
 * Prompt compiler: a solved shot becomes the text a hosted model receives.
 *
 * Ordering is deliberate and fixed. Subject leads because every model weights
 * early tokens hardest; the optical description follows because it is the part
 * that actually distinguishes this engine's output; body and glass come next as
 * corroborating detail; film and lighting close. A stable order is also what
 * makes two prompts diffable when one parameter changed.
 */
import { CAMERAS, FILM_STOCKS, LENSES, LIGHTING } from "./catalog.js";
import { getSensor } from "./sensors.js";
import {
  describeBackgroundBlur,
  describeDepthOfField,
  describePerspective,
  type SolvedShot,
} from "./solve.js";

export interface CompiledPrompt {
  readonly prompt: string;
  /** The prompt split into its labelled clauses, for inspection and diffing. */
  readonly segments: readonly PromptSegment[];
  /** Terms worth suppressing on backends that accept a negative prompt. */
  readonly negative: string;
}

export interface PromptSegment {
  readonly role:
    | "subject"
    | "optics"
    | "camera"
    | "lens"
    | "film"
    | "lighting"
    | "notes";
  readonly text: string;
}

const NEGATIVE_TERMS = [
  "oversharpened",
  "HDR halo",
  "plastic skin",
  "waxy texture",
  "blown highlights",
  "banding",
  "watermark",
  "text overlay",
  "extra fingers",
  "warped horizon",
  "chromatic fringing",
] as const;

export function compilePrompt(shot: SolvedShot): CompiledPrompt {
  const { request, dof, fov, backgroundBlurMm: blur } = shot;
  const camera = CAMERAS[request.camera];
  const lens = LENSES[request.lens];
  const film = FILM_STOCKS[request.film];
  const lighting = LIGHTING[request.lighting];
  const sensor = getSensor(camera.sensor);

  const segments: PromptSegment[] = [
    { role: "subject", text: request.subject.trim() },
    {
      role: "optics",
      text: [
        describePerspective(fov.equivalentFocalMm),
        describeDepthOfField(dof),
        describeBackgroundBlur(blur, sensor.cocMm),
        `focus held at ${formatDistance(request.subjectDistanceM)}`,
        `${fov.horizontalDeg.toFixed(0)} degree horizontal field of view`,
      ].join(", "),
    },
    {
      role: "camera",
      text: `shot on ${camera.label}, ${camera.rendering.join(", ")}`,
    },
    {
      role: "lens",
      text:
        `${lens.label} at ${request.focalMm}mm f/${request.aperture}, ` +
        lens.rendering.join(", "),
    },
    {
      role: "film",
      text: `${film.label}, ${film.rendering.join(", ")}, ISO ${request.iso}`,
    },
    {
      // Deliberately no metered light level here. The named setup already
      // states the scene's brightness, and deriving a second description from
      // the exposure settings produced prompts that contradicted themselves
      // ("golden hour ... low interior light") and that changed the described
      // scene whenever only the aperture moved. Exposure mismatch is a
      // validation concern, reported in SolvedShot.exposure instead.
      role: "lighting",
      text: `${lighting.label} lighting, ${lighting.rendering.join(", ")}`,
    },
  ];

  const notes = request.notes?.trim();
  if (notes) segments.push({ role: "notes", text: notes });

  return {
    prompt: segments.map((s) => s.text).join(". ") + ".",
    segments,
    negative: NEGATIVE_TERMS.join(", "),
  };
}

function formatDistance(metres: number): string {
  if (metres < 1) return `${(metres * 100).toFixed(0)}cm`;
  return `${metres.toFixed(metres < 10 ? 1 : 0)}m`;
}
