import { buildData, DataLevel, register, _testPoints } from './datastructure';
import { ArrayVector, TimeRange, Field, FieldType, LoadingState } from '@grafana/data';
import { ClusterviewOptions } from 'types';
import { ClusterviewPanel, Props } from 'ClusterviewPanel';
import { mock } from 'ts-mockito';


window.matchMedia =
  window.matchMedia ||
  function () {
    return {
      matches: false,
      addListener: function () {},
      removeListener: function () {},
    };
  };

jest.mock('@grafana/ui', () => {
  const orig = jest.requireActual('@grafana/ui');
  return {
    ...orig,
    useTheme2: () => {
      return {
        name: 'Grafana Dark',
        visualization: {
          getColorByName(x: string): string {
            return x;
          }
        }
      };
    },
  };
});

describe('Build data structure test', () => {
  test('', () => {
    let names = new ArrayVector([
      'x9000c1s0b0n0',
      'x9000c1s0b0n1',
      'x9000c1s0b1n0',
      'x9000c1s0b1n1',
      'x9000c1s0b2n0',
      'x9000c1s0b2n1',
      'x9000c1s0b3n0',
      'x9000c1s0b3n1',
      'x9000c1s1b0n0',
      'x9000c1s1b0n1',
      'x9000c1s1b1n0',
      'x9000c1s1b1n1',
      'x9000c1s1b2n0',
      'x9000c1s1b2n1',
      'x9000c1s1b3n0',
      'x9000c1s1b3n1',
      'x9000c2s0b0n0',
      'x9000c2s0b0n1',
      'x9000c2s0b1n0',
      'x9000c2s0b1n1',
      'x9000c2s0b2n0',
      'x9000c2s0b2n1',
      'x9000c2s0b3n0',
      'x9000c2s0b3n1',
    ]);
    const values = new ArrayVector([0, 1, 5, 10, 10, 10, 10, 10, 0, 0, 0, 0, 0, 0, 4, 0, 7, 8, 5, 2, 4, 6, 2, 0]);
    let opts = mock<Props>();
    opts.data = {
      state: LoadingState.Done,
      series: [
        {
          fields: [
            {
              name: 'host',
              type: FieldType.string,
              config: {},
              values: names,
            },
            {
              name: 'value',
              type: FieldType.number,
              config: {},
              values: values,
            },
          ],
          length: 2,
        },
      ],
      timeRange: mock<TimeRange>(),
    };

    opts.options.fieldgrp1 = '0';
    opts.options.matchgrp1 = `^x9000c(\\d)`;
    opts.options.valuesgrp1 = 'c1,c2';
    opts.options.fieldgrp2 = 'host';
    opts.options.matchgrp2 = '^x9000c\\ds(\\d)';
    opts.options.valuesgrp2 = 's1,s2,s3';
    opts.options.valuesgrp3 = '';
    opts.options.nodetext = 'xxx';
    opts.replaceVariables = (x) => x;

    register(opts.replaceVariables);
    const results = buildData(opts.options, opts.data.series[0].fields);
    expect(results);

    const answer = ClusterviewPanel(opts);
    expect(answer);
  });

  test('Lookup', () => {
    let fields: Field[] = [
      {
        name: 'host',
        type: FieldType.string,
        config: {},
        values: new ArrayVector(['xx0001', 'xx0002']),
      },
      {
        name: 'value',
        type: FieldType.number,
        config: {},
        values: new ArrayVector([4, 5]),
      },
    ];
    register((x) => {
      x = x.replace('${Test}', 'value');
      x = x.replace('${1}', '4');
      return x;
    });
    expect(_testPoints.lookupValue(fields, '1', 0)).toEqual(4);
    expect(_testPoints.lookupValue(fields, 'value', 1)).toEqual(5);
    expect(_testPoints.lookupValue(fields, '${Test}', 0)).toEqual(4);
    expect(_testPoints.lookupValue(fields, "return fields['value']", 0)).toEqual(4);
    expect(_testPoints.lookupValue(fields, 'return fields[1]', 0)).toEqual(4);
    expect(_testPoints.lookupValue(fields, "return fields['${Test}']", 1)).toEqual(5);
    expect(_testPoints.lookupValue(fields, 'return ${1}', 0)).toEqual(4);
  });

  test('Sort', () => {
    let options = mock<ClusterviewOptions>();
    options.aggregate = 'none';
    options.hiddennodes = '[[/A1/, /\\w2/], [/A2/, /B2/, /C2/]]';

    let data = new DataLevel('cluster');
    data.addDataNode(['A1', 'B1', 'C1'], 'n1', 0, 12345, '', 0);
    data.addDataNode(['A1', 'B1', 'C2'], 'n2', 0, 12345, '', 0);
    data.addDataNode(['A1', 'B2', 'C1'], 'n3', 0, 12345, '', 0);
    data.addDataNode(['A1', 'B2', 'C2'], 'n4', 0, 12345, '', 0);
    data.addDataNode(['A2', 'B1', 'C1'], 'n5', 0, 12345, '', 0);
    data.addDataNode(['A2', 'B1', 'C2'], 'n6', 0, 12345, '', 0);
    data.addDataNode(['A2', 'B2', 'C1'], 'n7', 0, 12345, '', 0);
    data.addDataNode(['A2', 'B2', 'C2'], 'n8', 0, 12345, '', 0);

    // _testPoints.sortdata(data, options);

    _testPoints.hide(data, options);

    expect(data.fetchLevel('A1').hidden).toBeFalsy();
    expect(data.fetchLevel('A1').fetchLevel('B1').hidden).toBeFalsy();
    expect(data.fetchLevel('A1').fetchLevel('B2').hidden).toBeTruthy();
    expect(data.fetchLevel('A1').fetchLevel('B2').fetchLevel('C1').hidden).toBeTruthy();
    expect(data.fetchLevel('A1').fetchLevel('B2').fetchLevel('C2').hidden).toBeTruthy();
    expect(data.fetchLevel('A2').hidden).toBeFalsy();
    expect(data.fetchLevel('A2').fetchLevel('B2').hidden).toBeFalsy();
    expect(data.fetchLevel('A2').fetchLevel('B2').fetchLevel('C1').hidden).toBeFalsy();
    expect(data.fetchLevel('A2').fetchLevel('B2').fetchLevel('C2').hidden).toBeTruthy();
  });
});
