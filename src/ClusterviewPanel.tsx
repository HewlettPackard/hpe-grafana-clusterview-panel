import React from 'react';
import { GrafanaTheme2, PanelProps } from '@grafana/data';
import { ClusterviewOptions } from 'types';
import { css, cx } from '@emotion/css';
import { useTheme2 } from '@grafana/ui';
import { buildData, DataLevel, Node, register } from './datastructure';
import { colorLookup, ColorSpectrum } from 'ColorSpectrum';

export interface Props extends PanelProps<ClusterviewOptions> {}

/**
 * The main panel view for the Clusterview display panel plugin
 * @param param0 parameters from grafana
 * @returns A panel
 */
export const ClusterviewPanel: React.FC<Props> = ({ options, data, width, height, replaceVariables }) => {
  const theme = useTheme2();
  const styles = buildStyles(options, theme);

  // register this as a callback so we can do variable substitution
  register(replaceVariables);

  // kick out if data is bad. Errors can cause the panel to stop responding until refresh
  try {
    if (!data.series[0]?.fields[0].values?.length || !data.series[0]?.fields?.[1].values?.length) {
      return <div>No Data</div>;
    }
  } catch (e) {
    return <div>Incorrect query format</div>;
  }

  const nodes = buildData(options, data.series[0].fields);
  const colors = new ColorSpectrum(options, theme);
  let renderLevel = 0;

  /**
   * Draw a single node as a div
   * @param node node to draw
   * @returns node as html
   */
  function drawNode(node: Node) {
    function visitURL() {
      let url = node.url;
      if (url) {
        if (options.nodeURLNewWindow) {
          window.open(url, '_blank');
        } else {
          location.href = url;
        }
      }
    }
    return (
      <div
        key={`${node.id}`}
        className={cx(
          styles.wrapper,
          css`
            width: ${options.nodeX}px;
            height: ${options.nodeY}px;
          `
        )}
        onClick={visitURL}
        style={{ backgroundColor: colors.getCSSColor(node?.value) }}
        title={node.text.length && !options.nodetextDisplayed ? node.text : undefined}
      >
        {node.text.length && options.nodetextDisplayed ? node.text : ''}
      </div>
    );
  }

  /**
   * Draw containing element around this group level and recurse into lower groups
   * @param data A grouping of data
   * @returns html for this grouping and all groupings inside it
   */
  function drawInnerContainer(data: DataLevel) {
    if (data.subLevel.size) {
      return Array.from(data.subLevel.values(), (v) => {
        return draw(v);
      });
    } else {
      return data.values.map((n) => drawNode(n));
    }
  }

  /**
   * Draw a layer of the heirarchy
   * @param data The level to draw (recursively)
   * @returns html for the layer
   */
  function draw(data: DataLevel) {
    renderLevel += 1;
    try {
      let border = options[`level${renderLevel}border` as keyof ClusterviewOptions];
      let label = options[`level${renderLevel}label` as keyof ClusterviewOptions];
      let direction = options[`level${renderLevel}direction` as keyof ClusterviewOptions];
      let boarderClass: string = styles[`${direction}border` as keyof typeof styles];
      let gridX = options[`gridX${renderLevel}` as keyof ClusterviewOptions];
      return (
        <div
          className={border ? cx(boarderClass) : ''}
          key={`${data.id}-a`}
          style={{ visibility: data.hidden ? 'hidden' : 'visible' }}
        >
          {label ? <div className={cx(styles.label)}>{data.prefix}</div> : null}
          <div
            key={`${data.id}-b`} // React wants unique keys on all divs
            className={`
            
            ${cx(
              styles[direction as keyof typeof styles],
              direction === 'gr'
                ? css`
                    grid-template-columns: repeat(${gridX}, 1fr);
                  `
                : ''
            )}
            lvl${renderLevel} box`}
          >
            {drawInnerContainer(data)}
          </div>
        </div>
      );
    } finally {
      renderLevel -= 1;
    }
  }

  // draw the panel
  return <div className={cx(styles.wrapper)}>{draw(nodes)}</div>;
};

/**
 * Build predefined css styles
 * @param options Plugin options from user
 * @param theme grafana theme (for color lookup)
 * @returns An objectmap with some css styles for drawing
 */
function buildStyles(options: ClusterviewOptions, theme: GrafanaTheme2) {
  return {
    hz: css`
      flex-direction: row;
      display: flex;
      padding: 0.5px;
    `,
    vt: css`
      flex-direction: column;
      display: flex;
      padding: 0.5px;
    `,
    fl: css`
      flex-direction: row;
      flex-wrap: wrap;
      display: flex;
      padding: 0.5px;
    `,
    gr: css`
      display: grid;
      padding: 0.5px;
    `,
    hzborder: css`
      border-top: 3px solid;
      border-color: ${colorLookup(options.bordercolor, theme)};
      margin: 1px;
      width: fit-content;
    `,
    vtborder: css`
      width: fit-content;
      border-left: 3px solid;
      border-color: ${colorLookup(options.bordercolor, theme)};
      margin: 1px;
    `,
    flborder: css``,
    grborder: css`
      width: fit-content;
      border-left: 3px solid;
      border-top: 3px solid;
      border-color: ${colorLookup(options.bordercolor, theme)};
      margin: 1px;
    `,
    label: css`
      margin-left: 3px;
      margin-bottom: -3px;
    `,
    wrapper: css`
      position: relative;
    `,
  };
}
