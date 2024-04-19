import { Parser, ColorPicker } from 'Colors';
import { instance, mock, when } from 'ts-mockito';
import { GrafanaTheme2, ThemeVisualizationColors } from '@grafana/data';

import { ClusterviewOptions } from 'types';

describe('Color Tests', () => {

  it('Test split', () => {
    let p = new Parser("((a.b_c-d == \"x 2 _ \" <=   2 !=  )&a==1   ' \"xx x')")
    expect(p.tokens).toStrictEqual(['(','(','a.b_c-d','==','"x 2 _ "','<=','2','!=',')','&','a','==','1',"' \"xx x'",')'])
  });

  it('Test condition (conditions)', () => {
    expect(new Parser("1==1 && 1=1").eval("")).toStrictEqual(true);
    expect(new Parser("1<2 && 1<=2 && 1<=1").eval("")).toStrictEqual(true);
    expect(new Parser("2>1 && 2>=1 && 2>=2").eval("")).toStrictEqual(true);
    expect(new Parser("1!=2").eval("")).toStrictEqual(true);
  });

  it('Test condition (negative)', () => {
    expect(new Parser("-1==-1 && -1!=1").eval("")).toStrictEqual(true);
  });

  it('Test condition (quotes)', () => {
    expect(new Parser("'1'==\"1\" and \"1\"!=\"2\" and '1'==1").eval("")).toStrictEqual(true);
  });

  it('Test condition (MATCH)', () => {
    expect(new Parser("'abc123' MATCH 'abc.*'").eval("")).toStrictEqual(true);
    expect(new Parser("'abc123' MATCH '.*123'").eval("")).toStrictEqual(true);
    expect(new Parser("'abc123' MATCHES '.*123'").eval("")).toStrictEqual(true);
    expect(new Parser("'abc123' MATCH 'abc??4'").eval("")).toStrictEqual(false);
    expect(new Parser("'abc123' MATCH 'abc123'").eval("")).toStrictEqual(true);
    expect(new Parser("'abc123' MATCH '^abc$'").eval("")).toStrictEqual(false);
  });

  it('Test condition (empty)', () => {
    expect(new Parser("").eval("1")).toStrictEqual(true);
  });

  it('Test condition (value)', () => {
    expect(new Parser("1").eval("1")).toStrictEqual(true);
    expect(new Parser("2").eval("1")).toStrictEqual(false);
    expect(new Parser("!=2").eval("3")).toStrictEqual(true);
    expect(new Parser("<2").eval("1")).toStrictEqual(true);
    expect(new Parser("<2").eval("2")).toStrictEqual(false);
  });

  it('Test condition (logic)', () => {
    expect(new Parser("1=1 AND 1=1 and 1=1 && 1=1 & 1=1").eval("")).toStrictEqual(true);
    expect(new Parser("2=1 AND 1=1 and 1=1 && 1=1 & 1=1").eval("")).toStrictEqual(false);
    expect(new Parser("1=1 AND 2=1 and 1=1 && 1=1 & 1=1").eval("")).toStrictEqual(false);
    expect(new Parser("1=1 AND 1=1 and 2=1 && 1=1 & 1=1").eval("")).toStrictEqual(false);
    expect(new Parser("1=1 AND 1=1 and 1=1 && 2=1 & 1=1").eval("")).toStrictEqual(false);
    expect(new Parser("1=1 AND 1=1 and 1=1 && 1=1 & 2=1").eval("")).toStrictEqual(false);
    expect(new Parser("1=1 OR 2=1 or 2=1 || 2=1 | 2=1").eval("")).toStrictEqual(true);
    expect(new Parser("2=1 OR 1=1 or 2=1 || 2=1 | 2=1").eval("")).toStrictEqual(true);
    expect(new Parser("2=1 OR 2=1 or 1=1 || 2=1 | 2=1").eval("")).toStrictEqual(true);
    expect(new Parser("2=1 OR 2=1 or 2=1 || 1=1 | 2=1").eval("")).toStrictEqual(true);
    expect(new Parser("2=1 OR 2=1 or 2=1 || 2=1 | 1=1").eval("")).toStrictEqual(true);
    expect(new Parser("2=1 OR 2=1 or 2=1 || 2=1 | 2=1").eval("")).toStrictEqual(false);
  });

  it('Test condition (parenths)', () => {
    expect(new Parser("4>2 && (1>2 || (1==1 && 3<4))").eval("")).toStrictEqual(true);
  });

  it('Pick Colors', () => {
    // declaration merging. ts is weird.
    interface ClusterviewOptionsStub extends ClusterviewOptions {}
    class ClusterviewOptionsStub implements ClusterviewOptions { // eslint-disable-line no-redeclare
      missingcolor = "rgb(0,0,0)";
    }
    const opts = new ClusterviewOptionsStub()
    
    const theme = mock<GrafanaTheme2>();
    const visualization = mock<ThemeVisualizationColors>();
    when(theme.visualization).thenReturn(instance(visualization));
    when(visualization.getColorByName).thenReturn(color=>color);
    
    let picker = new ColorPicker(opts, instance(theme));
    picker.addPoint("x==1", "red");
    picker.addPoint("x==2", "green");
    picker.addPoint("x==3 OR x=4", "yellow");

    expect(picker.pickColor((x) => {
      return x.replace(/x/g, "1");
    }, "")).toEqual(0);

    expect(picker.pickColor((x) => {
      return x.replace(/x/g, "2");
    }, "")).toEqual(1);

    expect(picker.pickColor((x) => {
      return x.replace(/x/g, "4");
    }, "")).toEqual(2);

    expect(picker.pickColor((x) => {
      return x.replace(/x/g, "10");
    }, "")).toEqual(-1);

  });

});

