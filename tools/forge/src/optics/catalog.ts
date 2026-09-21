/**
 * Camera, lens, film and lighting catalogue.
 *
 * Each entry carries both the physical facts the solver needs (sensor format,
 * focal range, aperture range) and the rendering vocabulary the prompt compiler
 * uses. Keeping them in one record is what stops the two drifting apart: you
 * cannot name a body in a prompt without also getting its sensor maths.
 */
import type { SensorId } from "./sensors.js";

export interface CameraBody {
  readonly id: string;
  readonly label: string;
  readonly sensor: SensorId;
  /** Native ISO range; the solver clamps requested ISO into this. */
  readonly isoRange: readonly [number, number];
  /** Descriptive traits folded into the prompt — colour science, not marketing. */
  readonly rendering: readonly string[];
}

export const CAMERAS = {
  a7riv: {
    id: "a7riv",
    label: "Sony a7R IV",
    sensor: "full_frame",
    isoRange: [100, 32000],
    rendering: ["clinical 61-megapixel detail", "neutral cool colour science", "deep shadow latitude"],
  },
  eos_r5: {
    id: "eos_r5",
    label: "Canon EOS R5",
    sensor: "full_frame",
    isoRange: [100, 51200],
    rendering: ["warm Canon skin rendition", "gentle highlight rolloff", "45-megapixel detail"],
  },
  z9: {
    id: "z9",
    label: "Nikon Z9",
    sensor: "full_frame",
    isoRange: [64, 25600],
    rendering: ["high dynamic range", "accurate neutral colour", "crisp micro-contrast"],
  },
  gfx100_ii: {
    id: "gfx100_ii",
    label: "Fujifilm GFX100 II",
    sensor: "medium_format",
    isoRange: [80, 12800],
    rendering: [
      "medium-format tonal separation",
      "creamy gradual focus falloff",
      "102-megapixel resolving power",
    ],
  },
  alexa35: {
    id: "alexa35",
    label: "ARRI ALEXA 35",
    sensor: "super35",
    isoRange: [160, 6400],
    rendering: ["filmic highlight rolloff", "17 stops of latitude", "organic cinema colour"],
  },
  x100vi: {
    id: "x100vi",
    label: "Fujifilm X100VI",
    sensor: "aps_c",
    isoRange: [125, 12800],
    rendering: ["documentary compact rendering", "Fujifilm colour science"],
  },
  deardorff_8x10: {
    id: "deardorff_8x10",
    label: "Deardorff 8x10 view camera",
    sensor: "large_format_8x10",
    isoRange: [50, 400],
    rendering: [
      "large-format sheet-film detail",
      "razor-thin focal plane with vast tonal scale",
      "view-camera movements",
    ],
  },
} as const satisfies Record<string, CameraBody>;

export type CameraId = keyof typeof CAMERAS;

export interface Lens {
  readonly id: string;
  readonly label: string;
  /** Inclusive focal range in millimetres; a prime has min === max. */
  readonly focalRangeMm: readonly [number, number];
  /** Widest and narrowest usable f-numbers. */
  readonly apertureRange: readonly [number, number];
  /**
   * Anamorphic horizontal squeeze. A spherical lens is 1; a 2x anamorphic
   * captures twice the horizontal angle onto the same sensor width, so the
   * field-of-view maths must widen accordingly. Omitted means 1.
   */
  readonly squeezeFactor?: number;
  readonly rendering: readonly string[];
}

export const LENSES = {
  sigma_35_art: {
    id: "sigma_35_art",
    label: "Sigma 35mm f/1.2 Art",
    focalRangeMm: [35, 35],
    apertureRange: [1.2, 16],
    rendering: ["clinically sharp wide-normal", "neutral rectilinear geometry"],
  },
  zeiss_planar_50: {
    id: "zeiss_planar_50",
    label: "Zeiss Planar 50mm f/1.4",
    focalRangeMm: [50, 50],
    apertureRange: [1.4, 16],
    rendering: ["classic normal perspective", "smooth rounded bokeh", "high micro-contrast"],
  },
  canon_85_12: {
    id: "canon_85_12",
    label: "Canon RF 85mm f/1.2L",
    focalRangeMm: [85, 85],
    apertureRange: [1.2, 16],
    rendering: [
      "flattering portrait compression",
      "extremely smooth background melt",
      "gentle spherical falloff",
    ],
  },
  nikon_105_macro: {
    id: "nikon_105_macro",
    label: "Nikon 105mm f/2.8 Micro",
    focalRangeMm: [105, 105],
    apertureRange: [2.8, 32],
    rendering: ["1:1 macro reproduction", "flat field", "clinical close-focus detail"],
  },
  sony_135_18: {
    id: "sony_135_18",
    label: "Sony FE 135mm f/1.8 GM",
    focalRangeMm: [135, 135],
    apertureRange: [1.8, 22],
    rendering: ["strong telephoto compression", "subject isolation", "creamy separation"],
  },
  cooke_s7_75: {
    id: "cooke_s7_75",
    label: "Cooke S7/i 75mm T2.0",
    focalRangeMm: [75, 75],
    apertureRange: [2.0, 22],
    rendering: ["the Cooke Look", "warm gentle rendering", "soft highlight bloom"],
  },
  panavision_anamorphic_50: {
    id: "panavision_anamorphic_50",
    label: "Panavision C-Series 50mm anamorphic",
    focalRangeMm: [50, 50],
    apertureRange: [2.8, 16],
    squeezeFactor: 2,
    rendering: [
      "2x anamorphic squeeze",
      "horizontal blue lens flares",
      "oval bokeh",
      "edge-field curvature",
    ],
  },
  helios_44_2: {
    id: "helios_44_2",
    label: "Helios 44-2 58mm f/2",
    focalRangeMm: [58, 58],
    apertureRange: [2, 16],
    rendering: ["swirly whirlpool bokeh", "low-contrast vintage rendering", "warm veiling flare"],
  },
} as const satisfies Record<string, Lens>;

export type LensId = keyof typeof LENSES;

export interface FilmStock {
  readonly id: string;
  readonly label: string;
  /** Box speed; the solver warns when requested ISO diverges far from this. */
  readonly boxIso: number;
  readonly rendering: readonly string[];
}

export const FILM_STOCKS = {
  digital_clean: {
    id: "digital_clean",
    label: "Clean digital",
    boxIso: 100,
    rendering: ["clean digital capture", "no grain", "neutral colour"],
  },
  portra_400: {
    id: "portra_400",
    label: "Kodak Portra 400",
    boxIso: 400,
    rendering: [
      "Kodak Portra 400 palette",
      "warm pastel skin tones",
      "fine forgiving grain",
      "soft highlight latitude",
    ],
  },
  ektachrome_e100: {
    id: "ektachrome_e100",
    label: "Kodak Ektachrome E100",
    boxIso: 100,
    rendering: ["slide-film saturation", "cool clean blues", "crisp fine grain"],
  },
  cinestill_800t: {
    id: "cinestill_800t",
    label: "CineStill 800T",
    boxIso: 800,
    rendering: [
      "tungsten-balanced night palette",
      "halated red highlight bloom",
      "visible cinematic grain",
    ],
  },
  trix_400: {
    id: "trix_400",
    label: "Kodak Tri-X 400",
    boxIso: 400,
    rendering: ["black and white", "gritty pronounced grain", "deep contrast curve"],
  },
  velvia_50: {
    id: "velvia_50",
    label: "Fujifilm Velvia 50",
    boxIso: 50,
    rendering: ["intense landscape saturation", "deep greens and reds", "ultra-fine grain"],
  },
} as const satisfies Record<string, FilmStock>;

export type FilmStockId = keyof typeof FILM_STOCKS;

export interface LightingSetup {
  readonly id: string;
  readonly label: string;
  /**
   * Plausible scene brightness this setup produces, as an inclusive EV100
   * range. The solver compares it against the EV the requested aperture,
   * shutter and ISO actually meter for, and reports the mismatch in stops.
   * This is what catches "f/1.2 at 1/160 in full sun" before a credit is spent.
   */
  readonly nominalEv100: readonly [number, number];
  readonly rendering: readonly string[];
}

export const LIGHTING = {
  rembrandt: {
    id: "rembrandt",
    label: "Rembrandt key",
    nominalEv100: [8, 12],
    rendering: [
      "single key at 45 degrees",
      "triangle of light on the shadow cheek",
      "deep falloff to shadow",
    ],
  },
  butterfly: {
    id: "butterfly",
    label: "Butterfly / beauty",
    nominalEv100: [9, 13],
    rendering: ["frontal elevated key", "symmetric nose shadow", "clean beauty-dish quality"],
  },
  rim_backlit: {
    id: "rim_backlit",
    label: "Rim backlight",
    nominalEv100: [8, 13],
    rendering: ["strong backlight", "bright separation rim on hair and shoulders", "low fill"],
  },
  golden_hour: {
    id: "golden_hour",
    label: "Golden hour",
    nominalEv100: [11, 14],
    rendering: [
      "low warm sun",
      "long raking shadows",
      "golden atmospheric haze",
      "lens-flare-prone backlight",
    ],
  },
  blue_hour: {
    id: "blue_hour",
    label: "Blue hour",
    nominalEv100: [5, 9],
    rendering: ["cool ambient twilight", "deep blue sky gradient", "warm practical lights"],
  },
  overcast_soft: {
    id: "overcast_soft",
    label: "Overcast softbox sky",
    nominalEv100: [11, 13],
    rendering: ["huge soft even light", "no hard shadows", "low contrast", "neutral colour"],
  },
  hard_noir: {
    id: "hard_noir",
    label: "Hard noir",
    nominalEv100: [5, 9],
    rendering: [
      "single hard source",
      "crushed blacks",
      "high-contrast chiaroscuro",
      "venetian-blind shadow pattern",
    ],
  },
  practical_neon: {
    id: "practical_neon",
    label: "Practical neon",
    nominalEv100: [3, 8],
    rendering: [
      "coloured practical neon sources",
      "magenta and cyan colour separation",
      "wet reflective surfaces",
    ],
  },
  studio_strobe: {
    id: "studio_strobe",
    label: "Studio strobe",
    nominalEv100: [12, 15],
    rendering: ["controlled strobe lighting", "clean seamless backdrop", "crisp specular highlights"],
  },
} as const satisfies Record<string, LightingSetup>;

export type LightingId = keyof typeof LIGHTING;

export const CAMERA_IDS = Object.keys(CAMERAS) as CameraId[];
export const LENS_IDS = Object.keys(LENSES) as LensId[];
export const FILM_STOCK_IDS = Object.keys(FILM_STOCKS) as FilmStockId[];
export const LIGHTING_IDS = Object.keys(LIGHTING) as LightingId[];
