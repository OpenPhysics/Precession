/**
 * PrecessionAngleGraphNode.ts
 *
 * Rolling φ(t) plot built with the Bamboo charting library. A dashed Ω_pred
 * reference line (LinearEquationPlot) overlays the measured trace.
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
import { calculateTickSpacing, tickDecimalsFor } from "../../common/view/BambooChartUtils.js";
import RigidBodyPrecessionColors from "../../RigidBodyPrecessionColors.js";
import { PRECESSION_GRAPH_HEIGHT } from "../../RigidBodyPrecessionConstants.js";
import type { SteadyPrecessionModel } from "../model/SteadyPrecessionModel.js";

const CHART_HEIGHT = PRECESSION_GRAPH_HEIGHT;
/** Room left of the plot for the y tick labels and, outside them, the axis title. */
const Y_AXIS_GUTTER = 52;
const X_AXIS_GUTTER = 34;
const TIME_WINDOW_S = 10;

const AXIS_FONT = new PhetFont({ size: 11 });
const LEGEND_FONT = new PhetFont({ size: 10 });
const TICK_LABEL_FONT = new PhetFont({ size: 10 });
const TICK_EXTENT = 6;

function legendSwatch(color: typeof RigidBodyPrecessionColors.graphTraceColorProperty, dashed = false): Node {
  if (dashed) {
    return new Rectangle(0, 0, 18, 3, {
      fill: color,
      stroke: color,
      lineDash: [4, 3],
      centerY: 0,
    });
  }
  return new Rectangle(0, 0, 18, 3, {
    fill: color,
    stroke: color,
    lineWidth: 1,
    centerY: 0,
  });
}

export class PrecessionAngleGraphNode extends Node {
  private readonly chartTransform: ChartTransform;
  private readonly dataPlot: LinePlot;
  private readonly predictionPlot: LinearEquationPlot;
  private readonly verticalGrid: GridLineSet;
  private readonly horizontalGrid: GridLineSet;
  private readonly xTickMarks: TickMarkSet;
  private readonly yTickMarks: TickMarkSet;
  private readonly xTickLabels: TickLabelSet;
  private readonly yTickLabels: TickLabelSet;
  private readonly model: SteadyPrecessionModel;
  /** Decimal places for the y tick labels, tracked so `createLabel` can read it. */
  private yDecimals = 1;

  public constructor(model: SteadyPrecessionModel, width = 360) {
    super();
    this.model = model;

    this.localBounds = new Bounds2(0, 0, width + Y_AXIS_GUTTER, CHART_HEIGHT + X_AXIS_GUTTER);

    this.chartTransform = new ChartTransform({
      viewWidth: width,
      viewHeight: CHART_HEIGHT,
      modelXRange: new Range(0, TIME_WINDOW_S),
      modelYRange: new Range(0, 4),
    });

    const chartOrigin = new Vector2(Y_AXIS_GUTTER, 0);

    const chartRectangle = new ChartRectangle(this.chartTransform, {
      fill: RigidBodyPrecessionColors.graphBackgroundColorProperty,
      stroke: RigidBodyPrecessionColors.panelBorderColorProperty,
      lineWidth: 1,
      cornerRadius: 4,
    });

    const initialXSpacing = calculateTickSpacing(TIME_WINDOW_S);
    const initialYSpacing = 1;

    this.verticalGrid = new GridLineSet(this.chartTransform, Orientation.VERTICAL, initialXSpacing, {
      stroke: RigidBodyPrecessionColors.graphGridColorProperty,
      lineWidth: 0.5,
    });
    this.horizontalGrid = new GridLineSet(this.chartTransform, Orientation.HORIZONTAL, initialYSpacing, {
      stroke: RigidBodyPrecessionColors.graphGridColorProperty,
      lineWidth: 0.5,
    });

    this.predictionPlot = new LinearEquationPlot(this.chartTransform, 0, 0, {
      stroke: RigidBodyPrecessionColors.precessionColorProperty,
      lineWidth: 1.5,
      lineDash: [6, 4],
      opacity: 0.75,
      visible: false,
    });

    this.dataPlot = new LinePlot(this.chartTransform, [], {
      stroke: RigidBodyPrecessionColors.graphTraceColorProperty,
      lineWidth: 2.5,
    });

    const clippedChartContent = new Node({
      clipArea: Shape.bounds(new Bounds2(0, 0, width, CHART_HEIGHT)),
      children: [chartRectangle, this.verticalGrid, this.horizontalGrid, this.predictionPlot, this.dataPlot],
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
      createLabel: (value) =>
        new Text(toFixed(value, 1), {
          font: TICK_LABEL_FONT,
          fill: RigidBodyPrecessionColors.textColorProperty,
          maxWidth: 36,
        }),
    });
    this.yTickLabels = new TickLabelSet(this.chartTransform, Orientation.VERTICAL, initialYSpacing, {
      edge: "min",
      extent: TICK_EXTENT,
      // φ climbs without bound, so the axis rescales constantly; match the label
      // precision to the live spacing or the labels collide into an unreadable smear.
      createLabel: (value) =>
        new Text(toFixed(value, this.yDecimals), {
          font: TICK_LABEL_FONT,
          fill: RigidBodyPrecessionColors.textColorProperty,
          maxWidth: 36,
        }),
    });

    const chartNode = new Node({
      translation: chartOrigin,
      children: [clippedChartContent, this.xTickMarks, this.yTickMarks, this.xTickLabels, this.yTickLabels],
    });
    this.addChild(chartNode);

    const yTitle = new Text("φ (rad)", {
      font: AXIS_FONT,
      fill: RigidBodyPrecessionColors.textColorProperty,
      rotation: -Math.PI / 2,
      centerY: CHART_HEIGHT / 2,
      // Outside the tick labels, which hang off the chart's left edge.
      right: Y_AXIS_GUTTER - 26,
    });
    const xTitle = new Text("t (s)", {
      font: AXIS_FONT,
      fill: RigidBodyPrecessionColors.textColorProperty,
      centerX: Y_AXIS_GUTTER + width / 2,
      top: CHART_HEIGHT + 16,
    });

    // Inside the plot's top-left corner: the trace climbs away from there, so the
    // legend never sits on the data, and it stays clear of the x tick labels.
    const legend = new HBox({
      spacing: 10,
      align: "center",
      children: [
        new HBox({
          spacing: 4,
          align: "center",
          children: [
            legendSwatch(RigidBodyPrecessionColors.graphTraceColorProperty),
            new Text("φ(t)", { font: LEGEND_FONT, fill: RigidBodyPrecessionColors.textColorProperty }),
          ],
        }),
        new HBox({
          spacing: 4,
          align: "center",
          children: [
            legendSwatch(RigidBodyPrecessionColors.precessionColorProperty, true),
            new Text("slope = Ω", { font: LEGEND_FONT, fill: RigidBodyPrecessionColors.textColorProperty }),
          ],
        }),
      ],
      left: Y_AXIS_GUTTER + 8,
      top: 6,
    });

    this.addChild(yTitle);
    this.addChild(xTitle);
    this.addChild(legend);

    Multilink.multilink(
      [model.timer.timeProperty, model.precessionAngleProperty, model.predictedPrecessionRateProperty],
      () => this.updatePlot(),
    );
    this.updatePlot();
  }

  private updatePlot(): void {
    const points = this.model.getGraphPoints();
    if (points.length === 0) {
      this.dataPlot.setDataSet([]);
      this.predictionPlot.visible = false;
      return;
    }

    const latestTime = points[points.length - 1]?.x ?? 0;
    const minTime = Math.max(0, latestTime - TIME_WINDOW_S);
    const maxTime = Math.max(TIME_WINDOW_S, latestTime);
    const xRange = new Range(minTime, maxTime);
    this.chartTransform.setModelXRange(xRange);

    const visibleAngles = points.filter((p) => p.x >= minTime).map((p) => p.y);
    const minAngle = Math.min(...visibleAngles, 0);
    const maxAngle = Math.max(...visibleAngles, 1);
    const padding = Math.max(0.15, 0.08 * (maxAngle - minAngle));
    const yRange = new Range(minAngle - padding, maxAngle + padding);
    this.chartTransform.setModelYRange(yRange);

    const xSpacing = calculateTickSpacing(xRange.getLength());
    const ySpacing = calculateTickSpacing(yRange.getLength());
    const yDecimals = tickDecimalsFor(ySpacing);
    if (yDecimals !== this.yDecimals) {
      // Labels are cached per value, so a precision change has to evict them or the
      // axis ends up reading "8, 6, 2.0, 0.0".
      this.yDecimals = yDecimals;
      this.yTickLabels.invalidateTickLabelSet();
    }
    this.verticalGrid.setSpacing(xSpacing);
    this.horizontalGrid.setSpacing(ySpacing);
    this.xTickMarks.setSpacing(xSpacing);
    this.yTickMarks.setSpacing(ySpacing);
    this.xTickLabels.setSpacing(xSpacing);
    this.yTickLabels.setSpacing(ySpacing);

    this.dataPlot.setDataSet(points.map((p) => new Vector2(p.x, p.y)));

    const omega = this.model.predictedPrecessionRateProperty.value;
    const phi0 = this.model.precessionAngleProperty.value;
    const t0 = latestTime;
    if (omega > 1e-9) {
      this.predictionPlot.m = omega;
      this.predictionPlot.b = phi0 - omega * t0;
      this.predictionPlot.visible = true;
    } else {
      this.predictionPlot.visible = false;
    }
  }
}
