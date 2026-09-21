/**
 * Sensor formats with the physical constants needed for depth-of-field and
 * field-of-view maths. `coc` is the circle of confusion in millimetres — the
 * largest blur spot still read as "in focus" at normal viewing size. It is the
 * term that makes DoF format-dependent, and it is why the same f-number looks
 * very different on Micro Four Thirds and on medium format.
 */
export interface SensorFormat {
  readonly id: string;
  readonly label: string;
  /** Active image area, millimetres. */
  readonly widthMm: number;
  readonly heightMm: number;
  /** Diagonal crop factor relative to 36x24mm full frame. */
  readonly cropFactor: number;
  /** Circle of confusion, millimetres. */
  readonly cocMm: number;
}

export const SENSORS = {
  full_frame: {
    id: "full_frame",
    label: "Full frame 36x24",
    widthMm: 36,
    heightMm: 24,
    cropFactor: 1.0,
    cocMm: 0.029,
  },
  aps_c: {
    id: "aps_c",
    label: "APS-C 23.6x15.7",
    widthMm: 23.6,
    heightMm: 15.7,
    cropFactor: 1.53,
    cocMm: 0.019,
  },
  aps_c_canon: {
    id: "aps_c_canon",
    label: "APS-C Canon 22.3x14.9",
    widthMm: 22.3,
    heightMm: 14.9,
    cropFactor: 1.61,
    cocMm: 0.018,
  },
  micro_four_thirds: {
    id: "micro_four_thirds",
    label: "Micro Four Thirds 17.3x13",
    widthMm: 17.3,
    heightMm: 13,
    cropFactor: 2.0,
    cocMm: 0.015,
  },
  super35: {
    id: "super35",
    label: "Super 35 cine 24.89x18.66",
    widthMm: 24.89,
    heightMm: 18.66,
    cropFactor: 1.39,
    cocMm: 0.02,
  },
  medium_format: {
    id: "medium_format",
    label: "Medium format 43.8x32.9",
    widthMm: 43.8,
    heightMm: 32.9,
    cropFactor: 0.79,
    cocMm: 0.035,
  },
  large_format_8x10: {
    id: "large_format_8x10",
    label: "Large format 8x10 sheet 254x203",
    widthMm: 254,
    heightMm: 203,
    cropFactor: 0.14,
    cocMm: 0.2,
  },
} as const satisfies Record<string, SensorFormat>;

export type SensorId = keyof typeof SENSORS;

export function getSensor(id: SensorId): SensorFormat {
  return SENSORS[id];
}

export const SENSOR_IDS = Object.keys(SENSORS) as SensorId[];
