import { GrafanaTheme2 } from '@grafana/data';
import { ClusterviewOptions } from 'types';

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
export class ColorPoint {
  rgb: number[] = [0, 0, 0];
  value: string;

  constructor(num: string, color: string, theme: GrafanaTheme2) {
    this.value = num;
    this.rgb = Color.ansi16(colorLookup(color, theme)).rgb().color;
  }
}


export interface TextTranslateCallback { (text: string): string }

export class Parser {
  tokens: string[];
  constructor(condition: string) {

    this.tokens = this.split(condition)
  }

  split(val: string): string[] {
    let result = val.match(/[\w._-]+|'.*?'|".*?"|[&|]+|[=<>!]+|\(|\)/g)
    if (!result) {
      return []
    }
    return result;
  }

  consume(): string{
    let result = this.tokens[0];
    this.tokens = this.tokens.splice(1);
    if (result[0] === '"' || result[0] === "'") {
      result = result.substring(1);
    }
    if (result.endsWith("'") || result.endsWith('"')) {
      result = result.substring(0, result.length-1);
    }
    return result;
  }

  isCond(val: string): boolean {
    return ['=','==','<','>','<=','>=','!=','MATCH','MATCHES'].includes(val?.toUpperCase());
  }

  checkCond(num1: string, op: string, num2: string): boolean {
    if (op === "=" || op === "==") {
      return num1 === num2;
    }
    if (op === "<") {
      return Number(num1) < Number(num2);
    }
    if (op === ">") {
      return Number(num1) > Number(num2);
    }
    if (op === "<=") {
      return Number(num1) <= Number(num2);
    }
    if (op === ">=") {
      return Number(num1) >= Number(num2);
    }
    if (op === "!=") {
      return num1 !== num2;
    }
    if (['MATCH','MATCHES'].includes(op.toUpperCase())) {
      return RegExp(num2).test(num1)
    }
    throw new SyntaxError("expected equality operator. Got "+op)
  }

  evalCond(val: string): boolean {
    if (!this.tokens[0]) {
      return true;
    }
    let num1 = this.consume();
    if (this.isCond(this.tokens[0])) {
      let op = this.consume();
      let num2 = this.consume();
      return this.checkCond(num1, op, num2);
    } else {
      if (this.isCond(num1)) {
        return this.checkCond(String(val), num1, this.consume());
      }
      return String(val) === num1;
    }
  }

  isLogicOp(val: string): boolean {
    return ['AND','&', '&&','OR','|', '||'].includes(val.toUpperCase());
  }

  evalExp(val: string): boolean {
    
    let result1 = false;

    if (this.tokens[0] === "(") {
      this.consume();
      result1 = this.evalExp(val)
      if (this.tokens.length === 0) {
        throw new SyntaxError("Unclosed '('");
      }
      let close = this.consume()
      if (close !== ")") {
        throw new SyntaxError("Expected ')'. Got "+close);
      }
    } else {
      result1 = this.evalCond(val)
    }

    if (this.tokens[0] === ")" || this.tokens.length === 0) {
      return result1;
    }

    if (this.isLogicOp(this.tokens[0])) {
      let op = this.consume()
      let result2 = this.evalExp(val)
      if (['AND', '&', '&&'].includes(op.toUpperCase())) {
        return result1 && result2;
      }
      if (['OR', '|', '||'].includes(op.toUpperCase())) {
        return result1 || result2;
      }
    }
    throw new SyntaxError("expected boolean operator. Got "+this.tokens[0])
  }
  eval(val: string): boolean {
    return this.evalExp(val)
  }
}

/**
 * 
 */
export class ColorPicker {
  colorsList: ColorPoint[];
  theme: GrafanaTheme2;
  defaultColor: string;

  constructor(options: ClusterviewOptions, theme: GrafanaTheme2) {
    this.colorsList = [];
    this.theme = theme;
    this.defaultColor = colorLookup(options.missingcolor, theme);
    if (options.conditions) {
      options.conditions.forEach((color) => {
        this.addPoint(color.expression, color.color);
      });
    }
  }

  addPoint(val: string, color: string) {
    this.colorsList.push(new ColorPoint(val, color, this.theme));
  }

  /**
   * 
   * @param transform Callback to replace variables in conditionals
   * @param val the default value to check against for simplified conditions
   * @returns The resulting index of the color
   */
  pickColor(transform: TextTranslateCallback, val: string | null): number {
    try {
        let i = this.colorsList.findIndex((cp) => {
        let translated = transform(String(cp.value));
        let p = new Parser(translated);
        return p.eval(val?val:"null")
      });
      if (i === undefined) {
        return -1;
      }
      return i;
    } catch (e) {
      console.error(e)
      return -1;
    }
  }


  /**
   * Get a CSS color string for the given value
   * @param val the value to fetch the color for
   * @returns A CSS color string (the default color if val is null/undefined)
   */
  getCSSColor(val: number): string {
    
    if (val === -1) {
      return this.defaultColor;
    }

    let rgb = this.colorsList[val].rgb;
    return cs.to.rgb(rgb);
  }
}
