import { InterpolateFunction, ScopedVars, Field } from '@grafana/data';
import { ClusterviewOptions } from './types';

export let replaceVariables: InterpolateFunction;

/**
 * allow the panel to tell us about the replaceVariables function (for variable substitution)
 * @param vars replaceVariables function
 */
export function register(vars: InterpolateFunction) {
  replaceVariables = vars;
}

/**
 * A Data node
 */
export class Node {
  text: string;
  value: number | null;
  timestamp: number | null;
  id: number;
  url: string | null;
  static _id_count = 1;
  constructor(text: string, value: number | null, ts: number | null, url: string | null) {
    this.text = text;
    this.value = value;
    this.timestamp = ts;
    this.url = url;

    // unique id so React knows about updates (even though grafana doesn't really use them)
    this.id = Node._id_count;
    Node._id_count++;
  }
}

/**
 * A level in a group, with references to sublevels and/or nodes
 */
export class DataLevel {
  prefix: string;
  subLevel: Map<string, DataLevel> = new Map();
  values: Node[] = [];
  id: number;
  hidden: boolean;

  static _id_count = 1;

  constructor(prefix: string) {
    this.prefix = prefix;
    this.hidden = false;

    // unique id
    this.id = DataLevel._id_count;
    DataLevel._id_count++;
  }

  /**
   * get the next level, creating it if it doesn't exist
   * @param prefix name for next group level
   * @returns A DataLevel with prefix as the name
   */
  fetchLevel(prefix: string) {
    let result = this.subLevel.get(prefix);
    if (result === undefined) {
      result = new DataLevel(prefix);
      this.subLevel.set(prefix, result);
    }
    return result as DataLevel;
  }

  /**
   * Add a new node to the datastructure
   * @param names a set of group names to register the node under
   * @param text node text
   * @param value numerical value for the node
   * @param ts timestamp
   * @param url a url fragment for clickability
   * @param level what level are we currently at
   */
  addDataNode(names: string[], text: string, value: number | null, ts: number, url: string, level: number) {
    if (names.length) {
      const nextLevel = this.fetchLevel(names[0]);
      nextLevel.addDataNode(names.splice(1), text, value, ts, url, level + 1);
    } else {
      this.values.push(new Node(text, value, ts, url));
    }
  }

  /**
   * Get's the first node that doesn't have a null value
   * @returns the first node that has a non-null value, or the last node
   */
  firstNotEmptyNode() {
    for (let n of this.values) {
      if (n.value != null) {
        return n;
      }
    }
    return this.values[this.values.length - 1];
  }
}

/**
 * Look up the index of a field by name or display name
 * @param fields array of data fields provided by grafana
 * @param fieldText the text for the field we're searching for
 * @returns The index of the field, or 0 if not found and hasDefault is true
 */
function lookupFieldIndex(fields: Field[], fieldText: string, hasDefault = true) {
  let index = -1;
  if (isNaN(+fieldText)) {
    fields.forEach((val, i) => {
      if (val.name === fieldText) {
        index = i;
      }
      // transforms work on displayName
      if (val.config?.displayName === fieldText) {
        index = i;
      }
    });
  } else {
    index = Number(fieldText);
  }

  if (index >= 0) {
    return index;
  }

  if (hasDefault) {
    return 0;
  }
  return undefined;
}

/**
 * Register a parsing function in parsers that is able to fetch names for
 * the given group.
 * @param parsers a list of parsing functions to reguster under
 * @param fields Array of data fields provided by grafana
 * @param fieldText The text provided by the user for this group
 * @param regex The regex provided by the user for this group
 */
function buildParserForGroup(
  parsers: Array<{ (f: Field[], i: number): string | undefined }>,
  fields: Field[],
  fieldText: string,
  regex: string
) {
  let index = lookupFieldIndex(fields, replaceVariables(fieldText))!;
  let matcher = RegExp('(.+)');
  if (regex) {
    try {
      matcher = RegExp(regex);
    } catch (error) {
      console.log('Bad regex ' + regex);
    }
  }
  if (regex || fieldText) {
    parsers.push((f: Field[], i: number): string | undefined => matcher.exec(f[index].values.get(i))?.[1]);
  }
}

function buildFields(fields: Field[], i: number) {
  let result: { [key: string]: string } = {};
  fields.forEach((v, j) => {
    let value = v.values.get(i);
    result[j] = value;
    result[v.name] = value;
    if (v.config?.displayName) {
      result[v.config.displayName] = value;
    }
  });
  return result;
}

/**
 * The value needs to be more complex than just a simple lookup. Try the field
 * as a raw number, as a generic field, and then as a chunk of javascript.
 *
 * @param fields array of data fields provided by grafana
 * @param txt the txt entered in the configuration
 * @param i Which index of the data we're on
 * @returns the resulting value we should use
 */
function lookupValue(fields: Field[], txt: string, i: number) {
  let rplTxt = replaceVariables(txt);
  let valueindex = lookupFieldIndex(fields, rplTxt, false);
  let value = null;
  if (!isNaN(+valueindex!)) {
    value = fields[valueindex!].values.get(i)
  } else {
    try {
      value = Function('fields', rplTxt)(buildFields(fields, i));
    } catch (e) {
      console.log(e);
    }
  }
  if (value !== null) {
    return Number(value);
  }
  return null;
}

/**
 * Do variable replacement on given text
 * @param text Text entered by user
 * @param fields Array of data fields provided by grafana
 * @param index which data element we're currently looking at
 * @param extraFields An extra fields that could be referenced by variable
 * @returns resulting text with substitutions
 */
function transformText(text: string, fields: Field[], index: number, extraFields: { [key: string]: string }) {
  let vars: ScopedVars = {};

  // add any extra fields
  for (let [k, v] of Object.entries(extraFields)) {
    vars[k] = { text: '', value: v };
  }

  // register field values
  fields.forEach((val, fi) => {
    let value = val.values.get(index);
    vars[val.name as keyof ScopedVars] = { text: '', value: value };
    vars[fi as keyof ScopedVars] = { text: '', value: value };
    if (val.config?.displayName) {
      // support displayName too
      vars[val.config.displayName as keyof ScopedVars] = { text: '', value: value };
    }
  });
  return replaceVariables(text, vars);
}

/**
 * Build the data structure from the given options and fields
 * @param options Panel options from user
 * @param fields Array of data fields provided by grafana
 * @returns A DataLevel object with all data organized into a drawable structure
 */
export const buildData = function (options: ClusterviewOptions, fields: Field[]): DataLevel {
  try {
    const data = new DataLevel('cluster');

    // we have to do this first so the proper order is established
    addMissing(data, options);

    let parsers: Array<{ (f: Field[], i: number): string | undefined }> = [];

    buildParserForGroup(parsers, fields, options.fieldgrp1, options.matchgrp1);
    buildParserForGroup(parsers, fields, options.fieldgrp2, options.matchgrp2);
    buildParserForGroup(parsers, fields, options.fieldgrp3, options.matchgrp3);
    buildParserForGroup(parsers, fields, options.fieldgrp4, options.matchgrp4);
    buildParserForGroup(parsers, fields, options.fieldgrp5, options.matchgrp5);
    buildParserForGroup(parsers, fields, options.fieldgrp6, options.matchgrp6);
    buildParserForGroup(parsers, fields, options.fieldgrp7, options.matchgrp7);
    buildParserForGroup(parsers, fields, options.fieldgrp8, options.matchgrp8);

    for (let i = 0; i < fields[0].values.length; i++) {
      let keys: string[] = [];
      parsers.forEach((val, j) => {
        keys.push(val(fields, i) ?? '');
      });

      let timestamp =
        options.timestampField != null ? fields[lookupFieldIndex(fields, options.timestampField)!].values.get(i) : null;

      let value = lookupValue(fields, options.nodevalue, i);

      let nodetext: string = transformText(options.nodetext, fields, i, { value: String(value) });
      let nodeURL: string = transformText(options.nodeURL, fields, i, { value: String(value) });

      if (!options.ignoreNull || value != null) {
        data.addDataNode(keys, nodetext, value, timestamp, nodeURL, 0);
      }
    }

    sortdata(data, options);
    hide(data, options);
    return data;
  } catch (e) {
    console.log(e);
  }
  return new DataLevel('ERROR');
};

/**
 * Add any data that's not provided by the query.
 *
 * If blank spots are not taken up, the display becomes ragged and unreadable.
 * Go through the options and draw out the missing items.
 * This is actually done first, and then the items that are present are updated.
 * @param data The current group level
 * @param options Panel options from the user
 * @param lvl the number for the level
 */
function addMissing(data: DataLevel, options: ClusterviewOptions, lvl = 0) {
  let liststr: string = replaceVariables(options[`valuesgrp${lvl + 1}` as keyof ClusterviewOptions] as string);
  let listopts = liststr
    ?.split(',')
    .map((s) => s.trim())
    .filter((st) => st !== '');

  listopts?.forEach((opt) => {
    data.fetchLevel(opt);
  });

  if (!data.subLevel.size && !data.values.length) {
    data.values.push(new Node('', null, null, null));
  }

  data.subLevel.forEach((l) => addMissing(l, options, lvl + 1));
}

/**
 * aggregate data down to a single datapoint for each node
 * @param data DataLevel object to work on
 * @param options Panel options from the user
 */
function aggregateData(data: DataLevel, options: ClusterviewOptions) {
  function aggregate(v: Node[], keepFirst: (a: Node, b: Node) => boolean) {
    while (v.length > 1) {
      if (keepFirst(v[0], v[1])) {
        // throw away second
        v.splice(1, 1);
      } else {
        // throw away first
        v.splice(0, 1);
      }
    }
  }
  if (data.values.length) {
    if (!options.timestampField || options.aggregate === 'none') {
      aggregate(data.values, (a, b) => {
        if (b.value == null) {
          return true;
        }
        return false;
      });
    }
    else {
      switch (options.aggregate) {
        case 'avg':
          let avgVal: number | null = null;
          let avgTs: number | null = null;
          let count = 0;
          let firstNode = data.firstNotEmptyNode();
          data.values.forEach((n) => {
            if (n.value != null) {
              avgVal! += n.value;
              avgTs! += n.timestamp!;
              count++;
            }
          });
          if (count >0) {
            avgVal! /= count;
            avgTs! /= count;
          } 
          data.values.length = 0;
          data.values.push(new Node(firstNode.text, avgVal, avgTs, firstNode.url));
          
          break;
        case 'last':
          aggregate(data.values, (a, b) => {
            if (a.timestamp! == null) {
              return false;
            }
            if (b.timestamp! == null) {
              return true;
            }
            return a.timestamp! > b.timestamp!;
          });
          break;
        case 'min':
          aggregate(data.values, (a, b) => {
            if (a.value! == null) {
              return false;
            }
            if (b.value! == null) {
              return true;
            }
            return a.value! < b.value!;
          });
          break;
        case 'max':
          aggregate(data.values, (a, b) => {
            if (a.value! == null) {
              return false;
            }
            if (b.value! == null) {
              return true;
            }
            return a.value! > b.value!;
          });
          break;
      }
    }
  }
}

function hide(data: DataLevel, options: ClusterviewOptions) {
  try {
    let fields = options.hiddennodes;
    let objs = Function('return ' + fields)();
    if (Array.isArray(objs)) {
      if (Array.isArray(objs[0])) {
        objs.forEach((o) => {
          o.unshift(/cluster/);
          _hideLevel(data, o);
        });
      } else {
        objs.unshift(/cluster/);
        _hideLevel(data, objs);
      }
    }
  } catch (e) {
    console.log(e);
  }
}

function _hideLevel(data: DataLevel, levels: RegExp[]): boolean {
  if (!levels.length || levels[0].test(data.prefix)) {
    let remaining = levels.slice(1);
    let vals = Array.from(data.subLevel.values());
    let results = vals.map((x) => _hideLevel(x, remaining));
    // every() catches empty too
    let allChildren = results.every((x) => x);

    if (allChildren) {
      data.hidden = true;
    }
    return allChildren;
  }
  return false;
}

/**
 * Sort and aggregate data
 * @param data The group level we're on
 * @param options Panel options from the user
 */
function sortdata(data: DataLevel, options: ClusterviewOptions) {
  try {
    data.subLevel.forEach((x) => sortdata(x, options));
    aggregateData(data, options);
  } catch (e) {
    console.log(e);
  }
}


export let _testPoints = {
  lookupValue: lookupValue,
  sortdata: sortdata,
  hide: hide,
  _hideLevel: _hideLevel,
};
