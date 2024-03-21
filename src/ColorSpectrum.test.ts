import { ColorSpectrum } from 'ColorSpectrum';
import { instance, mock, when } from 'ts-mockito';
import { GrafanaTheme2, ThemeVisualizationColors } from '@grafana/data';

import { ClusterviewOptions } from 'types';

describe('Color Tests', () => {
  it('Test lookup', () => {


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

    let cs = new ColorSpectrum(opts, instance(theme));
    cs.addPoint(10, 'rgb(50,50,50)');
    cs.addPoint(20, 'rgb(70,60,50)');
    expect(cs.fetchColor(0)).toStrictEqual([50, 50, 50]);
    expect(cs.fetchColor(10)).toStrictEqual([50, 50, 50]);
    expect(cs.fetchColor(15)).toStrictEqual([60, 55, 50]);
    expect(cs.fetchColor(19)).toStrictEqual([68, 59, 50]);
    expect(cs.fetchColor(20)).toStrictEqual([70, 60, 50]);
    expect(cs.fetchColor(30)).toStrictEqual([70, 60, 50]);
  });
});
