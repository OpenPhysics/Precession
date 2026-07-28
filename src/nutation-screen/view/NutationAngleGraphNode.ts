/**
 * NutationAngleGraphNode.ts
 *
 * Rolling θ(t) plot. The trace oscillates between two dashed reference lines at
 * θ_min and θ_max — the turning points predicted by the effective potential — so
 * the graph and the scene's nutation band tell the same story two ways.
 */

import { Multilink } from "scenerystack/axon";
import {
  ChartRectangle,
  ChartTransform,
  GridLineSet,
  LinearEquationPlot,
  LinePlot,
  TickLabelSet,
  TickMarkSet,
} from "scenerystack/bamboo";
import { Bounds2, Range, toFixed, Vector2 } from "scenerystack/dot";
import { Shape } from "scenerystack/kite";
import { Orientation } from "scenerystack/phet-core";
import { HBox, Node, Rectangle, Text } from "scenerystack/scenery";
import { PhetFont } from "scenerystack/scenery-phet";
import { calculateTickSpacing } from "../../common/view/BambooChartUtils.js";
import RigidBodyPrecessionColors from "../../RigidBodyPrecessionColors.js";
import { NUTATION_GRAPH_HEIGHT, NUTATION_GRAPH_WINDOW_S } from "../../RigidBodyPrecessionConstants.js";
import type { NutationModel } from "../model/NutationModel.js";

const CHART_HEIGHT = NUTATION_GRAPH_HEIGHT;
const Y_AXIS_GUTTER = 56;
/** Room below the plot for the tick labels, the axis title, and the legend row. */
const X_AXIS_GUTTER = 54;

const AXIS_FONT = new PhetFont({ size: 11 });
const LEGEND_FONT = new PhetFont({ size: 10 });
const TICK_LABEL_FONT = new PhetFont({ size: 10 });
const TICK_EXTENT = 6;

const RADIANS_TO_DEGREES = 180 / Math.PI;

function legendSwatch(color: typeof RigidBodyPrecessionColors.tipTraceColorProperty, dashed = false): Node {
  return new Rectangle(0, 0, 18, 3, {
    fill: color,
    stroke: color,
    lineWidth: 1,
    lineDash: dashed ? [4, 3] : [],
    centerY: 0,
  });
}

export class NutationAngleGraphNode extends Node {
  private readonly chartTransform: ChartTransform;
  private readonly dataPlot: LinePlot;
  private readonly thetaMinPlot: LinearEquationPlot;
  private readonly thetaMaxPlot: LinearEquationPlot;
  private readonly verticalGrid: GridLineSet;
  private readonly horizontalGrid: GridLineSet;
  private readonly xTickMarks: TickMarkSet;
  private readonly yTickMarks: TickMarkSet;
  private readonly xTickLabels: TickLabelSet;
  private readonly yTickLabels: TickLabelSet;
  private readonly model: NutationModel;

  public constructor(model: NutationModel, width = 360) {
    super();
    this.model = model;

    this.localBounds = new Bounds2(0, 0, width + Y_AXIS_GUTTER, CHART_HEIGHT + X_AXIS_GUTTER);

    this.chartTransform = new ChartTransform({
      viewWidth: width,
      viewHeight: CHART_HEIGHT,
      modelXRange: new Range(0, NUTATION_GRAPH_WINDOW_S),
      modelYRange: new Range(0, 90),
    });

    const chartRectangle = new ChartRectangle(this.chartTransform, {
      fill: RigidBodyPrecessionColors.graphBackgroundColorProperty,
      stroke: RigidBodyPrecessionColors.panelBorderColorProperty,
      lineWidth: 1,
      cornerRadius: 4,
    });

    const initialXSpacing = calculateTickSpacing(NUTATION_GRAPH_WINDOW_S);
    const initialYSpacing = 15;

    this.verticalGrid = new GridLineSet(this.chartTransform, Orientation.VERTICAL, initialXSpacing, {
      stroke: RigidBodyPrecessionColors.graphGridColorProperty,
      lineWidth: 0.5,
    });
    this.horizontalGrid = new GridLineSet(this.chartTransform, Orientation.HORIZONTAL, initialYSpacing, {
      stroke: RigidBodyPrecessionColors.graphGridColorProperty,
      lineWidth: 0.5,
    });

    // Horizontal reference lines (slope 0) at the two turning points.
    this.thetaMinPlot = new LinearEquationPlot(this.chartTransform, 0, 0, {
      stroke: RigidBodyPrecessionColors.nutationBandColorProperty,
      lineWidth: 1.5,
      lineDash: [6, 4],
      opacity: 0.85,
    });
    this.thetaMaxPlot = new LinearEquationPlot(this.chartTransform, 0, 0, {
      stroke: RigidBodyPrecessionColors.nutationBandColorProperty,
      lineWidth: 1.5,
      lineDash: [6, 4],
      opacity: 0.85,
    });

    this.dataPlot = new LinePlot(this.chartTransform, [], {
      stroke: RigidBodyPrecessionColors.tipTraceColorProperty,
      lineWidth: 2.5,
    });

    const clippedChartContent = new Node({
      clipArea: Shape.bounds(new Bounds2(0, 0, width, CHART_HEIGHT)),
      children: [
        chartRectangle,
        this.verticalGrid,
        this.horizontalGrid,
        this.thetaMinPlot,
        this.thetaMaxPlot,
        this.dataPlot,
      ],
    });

    this.xTickMarks = new TickMarkSet(this.chartTransform, Orientation.HORIZONTAL, initialXSpacing, {
      edge: "min",
      extent: TICK_EXTENT,
      stroke: RigidBodyPrecessionColors.panelBorderColorProperty,
    });
    this.yTickMarks = new TickMarkSet(this.chartTransform, Orientation.VERTICAL, initialYSpacing, {
      edge: "min",
      extent: TICK_EXTENT,
      stroke: RigidBodyPrecessionColors.panelBorderColorProperty,
    });
    this.xTickLabels = new TickLabelSet(this.chartTransform, Orientation.HORIZONTAL, initialXSpacing, {
      edge: "min",
      extent: TICK_EXTENT,
      createLabel: (value: number) =>
        new Text(toFixed(value, 1), {
          font: TICK_LABEL_FONT,
          fill: RigidBodyPrecessionColors.textColorProperty,
          maxWidth: 36,
        }),
    });
    this.yTickLabels = new TickLabelSet(this.chartTransform, Orientation.VERTICAL, initialYSpacing, {
      edge: "min",
      extent: TICK_EXTENT,
      createLabel: (value: number) =>
        new Text(toFixed(value, 0), {
          font: TICK_LABEL_FONT,
          fill: RigidBodyPrecessionColors.textColorProperty,
          maxWidth: 36,
        }),
    });

    const chartNode = new Node({
      translation: new Vector2(Y_AXIS_GUTTER, 0),
      children: [clippedChartContent, this.xTickMarks, this.yTickMarks, this.xTickLabels, this.yTickLabels],
    });
    this.addChild(chartNode);

    this.addChild(
      new Text("θ (°)", {
        font: AXIS_FONT,
        fill: RigidBodyPrecessionColors.textColorProperty,
        rotation: -Math.PI / 2,
        centerY: CHART_HEIGHT / 2,
        // Clear of the y tick labels, which sit just left of the chart edge.
        right: Y_AXIS_GUTTER - 24,
      }),
    );
    this.addChild(
      new Text("t (s)", {
        font: AXIS_FONT,
        fill: RigidBodyPrecessionColors.textColorProperty,
        centerX: Y_AXIS_GUTTER + width / 2,
        top: CHART_HEIGHT + 18,
      }),
    );

    this.addChild(
      new HBox({
        spacing: 12,
        align: "center",
        children: [
          new HBox({
            spacing: 4,
            align: "center",
            children: [
              legendSwatch(RigidBodyPrecessionColors.tipTraceColorProperty),
              new Text("θ(t)", { font: LEGEND_FONT, fill: RigidBodyPrecessionColors.textColorProperty }),
            ],
          }),
          new HBox({
            spacing: 4,
            align: "center",
            children: [
              legendSwatch(RigidBodyPrecessionColors.nutationBandColorProperty, true),
              new Text("turning points", {
                font: LEGEND_FONT,
                fill: RigidBodyPrecessionColors.textColorProperty,
              }),
            ],
          }),
        ],
        // Its own row under the axis title, clear of the last x tick label.
        centerX: Y_AXIS_GUTTER + width / 2,
        top: CHART_HEIGHT + 37,
      }),
    );

    Multilink.multilink([model.thetaProperty, model.nutationBandProperty], () => this.updatePlot());
    this.updatePlot();
  }

  private updatePlot(): void {
    const points = this.model.getThetaGraphPoints();
    const band = this.model.nutationBandProperty.value;
    const thetaMinDegrees = band.thetaMin * RADIANS_TO_DEGREES;
    const thetaMaxDegrees = band.thetaMax * RADIANS_TO_DEGREES;

    const latestTime = points[points.length - 1]?.x ?? 0;
    const minTime = Math.max(0, latestTime - NUTATION_GRAPH_WINDOW_S);
    const maxTime = Math.max(NUTATION_GRAPH_WINDOW_S, latestTime);
    const xRange = new Range(minTime, maxTime);
    this.chartTransform.setModelXRange(xRange);

    const visibleAngles = points.filter((point) => point.x >= minTime).map((point) => point.y);
    const lowest = Math.min(...visibleAngles, thetaMinDegrees);
    const highest = Math.max(...visibleAngles, thetaMaxDegrees);
    const padding = Math.max(3, 0.12 * (highest - lowest));
    const yRange = new Range(Math.max(0, lowest - padding), Math.min(180, highest + padding));
    this.chartTransform.setModelYRange(yRange);

    const xSpacing = calculateTickSpacing(xRange.getLength());
    const ySpacing = calculateTickSpacing(yRange.getLength());
    this.verticalGrid.setSpacing(xSpacing);
    this.horizontalGrid.setSpacing(ySpacing);
    this.xTickMarks.setSpacing(xSpacing);
    this.yTickMarks.setSpacing(ySpacing);
    this.xTickLabels.setSpacing(xSpacing);
    this.yTickLabels.setSpacing(ySpacing);

    this.dataPlot.setDataSet(points.map((point) => new Vector2(point.x, point.y)));

    this.thetaMinPlot.b = thetaMinDegrees;
    this.thetaMaxPlot.b = thetaMaxDegrees;
    const bandVisible = thetaMaxDegrees - thetaMinDegrees > 0.05;
    this.thetaMinPlot.visible = bandVisible;
    this.thetaMaxPlot.visible = bandVisible;
  }
}
