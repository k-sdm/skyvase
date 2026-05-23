import type { GradientStop } from "@/components/vase-preview";

export const VASE_SOURCE_WIDTH = 1080;
export const VASE_SOURCE_HEIGHT = 1350;

const VASE_TOP_Y = 466;
const VASE_BOTTOM_Y = 1214;
const VASE_HALF_WIDTH = 150;
const FOCUS_X = VASE_SOURCE_WIDTH / 2;
const FOCUS_Y = 300;

const TOP_DIST = VASE_TOP_Y - FOCUS_Y;
const BOTTOM_DIST = VASE_BOTTOM_Y - FOCUS_Y;
const CURVE_RADIUS = Math.sqrt(
  VASE_HALF_WIDTH * VASE_HALF_WIDTH +
    Math.max(Math.abs(TOP_DIST), Math.abs(BOTTOM_DIST)) ** 2
);
const RADIAL_START = TOP_DIST / CURVE_RADIUS;
const RADIAL_END = BOTTOM_DIST / CURVE_RADIUS;

export const VASE_RADIAL_GRADIENT = {
  cx: FOCUS_X,
  cy: FOCUS_Y,
  r: CURVE_RADIUS,
  fx: FOCUS_X,
  fy: FOCUS_Y,
} as const;

export function mapLinearStopToRadialOffset(linearOffset: number): number {
  return RADIAL_START + linearOffset * (RADIAL_END - RADIAL_START);
}

export function radialStopOffsetPercent(linearOffset: number): string {
  return `${(mapLinearStopToRadialOffset(linearOffset) * 100).toFixed(3)}%`;
}

export function buildRadialStopElements(stops: GradientStop[]): string {
  return stops
    .map(
      (s) =>
        `      <stop offset="${radialStopOffsetPercent(s.offset)}" stop-color="${s.color}" />`
    )
    .join(`\n`);
}
