import { GrafanaTheme2 } from '@grafana/data';
import { ClusterviewOptions, MAX_THRESHOLDS } from 'types';

const Color = require('color');
let cs = require('color-string');

/**
 * translate the given color to a standard css color
 * @param clr color string to look up
 * @param theme Grafana theme to fetch named colors from
 * @returns color as a string
 */
export function colorLookup(clr: string, theme: GrafanaTheme2) {
  return theme.visualization.getColorByName(clr);
}

/**
 * A Color at a particular value. Used to generate a gradient.
 */
class ColorPoint {
  rgb: number[] = [0, 0, 0];
  value: number;

  constructor(num: number, color: string, theme: GrafanaTheme2) {
    this.value = num;
    this.rgb = Color.ansi16(colorLookup(color, theme)).rgb().color;
  }
}

/**
 * Holds information about a gradient of color for different values.
 */
export class ColorSpectrum {
  colorsList: ColorPoint[] = [];
  theme: GrafanaTheme2;
  defaultColor: string;

  /**
   * Builds a color gradient from the config options
   * @param options The options specified from grafana
   * @param theme Grafana theme (to look up colors)
   */
  constructor(options: ClusterviewOptions, theme: GrafanaTheme2) {
    this.colorsList = [];
    this.theme = theme;
    this.defaultColor = colorLookup(options.missingcolor, theme);
    for (let i = 0; i < MAX_THRESHOLDS; i++) {
      let keyColor: keyof ClusterviewOptions = `thresholdcolor${i + 1}` as keyof ClusterviewOptions;
      let keyValue = `thresholdvalue${i + 1}` as keyof ClusterviewOptions;
      //TODO - val could be scriptable or a variable
      let val: number | undefined = options[keyValue] as number | undefined;
      if (val !== undefined) {
        let color: string = options[keyColor] as string;
        this.addPoint(val, color);
      }
    }
  }

  /**
   * Average two colors together
   * @param prev A ColorPoint <= the value (if it exists)
   * @param next A ColorPoint >= the value
   * @param val The value
   * @returns an array or rgb color components, averaged between the ColorPoints
   */
  averageColors(prev: ColorPoint | null, next: ColorPoint, val: number): number[] {
    if (!prev) {
      return next.rgb;
    }
    let ratio: number = (val - prev.value) / (next.value - prev.value);
    let rgb: number[] = [
      prev.rgb[0] * (1 - ratio) + next.rgb[0] * ratio,
      prev.rgb[1] * (1 - ratio) + next.rgb[1] * ratio,
      prev.rgb[2] * (1 - ratio) + next.rgb[2] * ratio,
    ];
    return rgb;
  }

  /**
   * Get a CSS color string for the given value
   * @param val the value to fetch the color for
   * @returns A CSS color string (the default color if val is null/undefined)
   */
  getCSSColor(val: number | null): string {
    if (val != null) {
      let rgb = this.fetchColor(val!);
      return cs.to.rgb(rgb);
    }
    return this.defaultColor;
  }

  /**
   * Get the color in the gradient for a given value
   * @param val a numerical value to check against to get a color in the gradient
   * @returns An array of rgb color components
   */
  fetchColor(val: number): number[] {
    let prev: ColorPoint | null = null;
    for (let cp of this.colorsList) {
      if (cp.value >= val) {
        return this.averageColors(prev, cp, val);
      }
      prev = cp;
    }
    if (prev) {
      return prev.rgb;
    } else {
      // no points
      return [0, 0, 0];
    }
  }

  /**
   * Add a point to the gradient. Order of insertion is not important.
   * @param val The value to register at
   * @param color A color, either a grafana named color or css string
   */
  addPoint(val: number, color: string) {
    this.colorsList.push(new ColorPoint(val, color, this.theme));
    this.colorsList = this.colorsList.sort((a, b) => a.value - b.value);
  }
}
