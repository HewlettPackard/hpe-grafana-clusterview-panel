import { PanelPlugin, PanelOptionsEditorBuilder } from '@grafana/data';
import { ClusterviewPanel } from 'ClusterviewPanel';
import { ConditionEditor } from 'ThresholdEditor';
import { ClusterviewOptions } from 'types';
// import { PanelOptionsEditorBuilder } from '@grafana/data/utils/';

/**
 * Helper to determine if to show a configuration
 * @param conf Panel options
 * @param lvl group level to check
 * @returns true or false
 */
function showLevel(conf: ClusterviewOptions, lvl: number): boolean {
  if (lvl === 1) {
    return true;
  }
  let key = `fieldgrp${lvl - 1}` as unknown as keyof ClusterviewOptions;
  return conf[key] != null; // purposely skip type check to catch both null and undef
}


function _isGridLayout(c: ClusterviewOptions, lvl: number) {
  let key = `level${lvl}direction` as unknown as keyof ClusterviewOptions;
  return c[key] === 'gr';
}

function buildLevelDisplayOption(builder: PanelOptionsEditorBuilder<ClusterviewOptions>, lvl: number, defaults: any[]) {
  //TODO the default options in grafana are really spread out. This could probably
  // be its own custom panel.

  let category = [`Layout Group ${lvl}`];
  builder
    .addTextInput({
      path: `fieldgrp${lvl}`,
      name: 'Field',
      description: "Field to use for this group's data. numerical index or field name",
      category: category,
      showIf: (c) => showLevel(c, lvl),
      settings: {
        placeholder: '0 | hostname.keyword',
      },
    })
    .addTextInput({
      path: `matchgrp${lvl}`,
      name: 'Regex Match',
      description: 'Partial match of field based on regex group. Leave blank to group by entire field.',
      category: category,
      settings: {
        placeholder: '(.+)',
      },
      showIf: (c) => showLevel(c, lvl),
    })
    .addTextInput({
      path: `valuesgrp${lvl}`,
      name: 'Possible Values',
      description:
        'List of possible options for this grouping to represent missing datapoints (in display order). Can be empty.',
      category: category,
      settings: {
        placeholder: 'c1, c2, c3 ...',
      },
      showIf: (c) => showLevel(c, lvl),
    })
    .addBooleanSwitch({
      path: `level${lvl}border`,
      name: 'Draw border',
      category: category,
      defaultValue: defaults[0],
      showIf: (c) => showLevel(c, lvl) && c[`level${lvl}direction` as unknown as keyof ClusterviewOptions] !== 'fl',
    })
    .addBooleanSwitch({
      path: `level${lvl}label`,
      name: 'Show Label',
      category: category,
      defaultValue: defaults[1],
      showIf: (c) => showLevel(c, lvl) && lvl !== 1,
    })
    .addRadio({
      path: `level${lvl}direction`,
      name: `Layout`,
      category: category,
      settings: {
        options: [
          {
            value: 'hz',
            label: 'Horizontal',
          },
          {
            value: 'vt',
            label: 'Vertical',
          },
          {
            value: 'fl',
            label: 'Flow',
          },
          {
            value: 'gr',
            label: 'Grid',
          },
        ],
      },
      defaultValue: defaults[2],
      showIf: (c) => showLevel(c, lvl),
    })
    .addNumberInput({
      path: `gridX${lvl}`,
      name: 'Grid Columns',
      category: category,
      description: 'The number of columns for a grid display',
      defaultValue: 2,
      showIf: (c) => showLevel(c, lvl) && _isGridLayout(c, lvl),
    });
}

export const plugin = new PanelPlugin<ClusterviewOptions>(ClusterviewPanel).setPanelOptions((builder) => {
  builder
    .addTextInput({
      path: 'nodeURL',
      name: 'Node URL',
      category: ['Node'],
      description: 'A URL to attach to nodes. variables supported (${xx}).',
      defaultValue: '',
    })
    .addBooleanSwitch({
      path: 'nodeURLNewWindow',
      name: 'New Window',
      category: ['Node'],
      description: 'Open URL in new window',
      defaultValue: false,
    })
    .addTextInput({
      path: 'nodetext',
      name: 'Node Text',
      category: ['Node'],
      description: 'Text to display for each node',
      settings: {
        placeholder: '${0} ${fldname} ${value}...',
      },
    })
    .addBooleanSwitch({
      path: 'nodetextDisplayed',
      name: 'In-node Display',
      category: ['Node'],
      description: 'Text displayed in node instead of hover',
      defaultValue: false,
    })
    .addTextInput({
      path: 'nodevalue',
      name: 'Value Field',
      category: ['Node'],
      description: 'Field to use for value. index or name or javascript',
      defaultValue: '1',
      settings: {
        placeholder: '1  fieldname `return field[3] || field["value"];`',
      },
    })
    .addTextInput({
      path: 'hiddennodes',
      name: 'Hidden Nodes',
      category: ['Node'],
      description: 'List(s) of regexs to filter out displayed nodes',
      defaultValue: '',
      settings: {
        placeholder: '[[/x11/,/02/],[/x21/,//]]',
      },
    })
    .addNumberInput({
      path: 'nodeX',
      name: 'Node Width',
      category: ['Node'],
      settings: {
        integer: true,
        min: 2,
        max: 200,
      },
      defaultValue: 20,
    })
    .addNumberInput({
      path: 'nodeY',
      name: 'Node Height',
      category: ['Node'],
      settings: {
        integer: true,
        min: 2,
        max: 200,
      },
      defaultValue: 20,
    })

    .addSelect({
      path: 'aggregate',
      name: 'Aggregate data',
      category: ['Aggregate'],
      defaultValue: 'None',
      settings: {
        options: [
          {
            label: 'None',
            value: 'none',
          },
          {
            label: 'Max',
            value: 'max',
          },
          {
            label: 'Min',
            value: 'min',
          },
          {
            label: 'Avg',
            value: 'avg',
          },
          {
            label: 'Last',
            value: 'last',
          },
        ],
      },
    })
    .addTextInput({
      path: 'timestampField',
      name: 'Timestamp Field',
      category: ['Aggregate'],
      showIf: (config) => config.aggregate === 'last',
      settings: {
        placeholder: '1  fieldname',
      },
    })
    .addBooleanSwitch({
      path: `ignoreNull`,
      name: 'Ignore Null Values',
      category: ['Aggregate'],
      defaultValue: true,
    })
    .addColorPicker({
      category: ['Values/Colors'],
      name: `missing Color`,
      path: 'missingcolor',
      defaultValue: 'rgb(50,50,50)',
    })
    .addColorPicker({
      category: ['Values/Colors'],
      name: `Border Color`,
      path: 'bordercolor',
      defaultValue: 'rgb(50,50,50)',
    });

  buildLevelDisplayOption(builder, 1, [false, false, 'fl']);
  buildLevelDisplayOption(builder, 2, [true, true, 'vt']);
  buildLevelDisplayOption(builder, 3, [false, false, 'hz']);
  buildLevelDisplayOption(builder, 4, [true, false, 'vt']);
  buildLevelDisplayOption(builder, 5, [false, false, 'hz']);
  buildLevelDisplayOption(builder, 6, [false, false, 'hz']);
  buildLevelDisplayOption(builder, 7, [false, false, 'hz']);
  buildLevelDisplayOption(builder, 8, [false, false, 'hz']);

  builder.addCustomEditor({
      editor: ConditionEditor,
      id: `conditions`,
      path: `conditions`,
      category: ['Values/Colors'],
      name: `Conditions`,
    });

  return builder;
});
