/**
 * PrecessionAngleGraphNode.ts
 *
 * Rolling φ(t) plot with a dashed Ω_pred reference slope for comparison.
 */

import { Multilink } from "scenerystack/axon";
import { ChartRectangle, ChartTransform, GridLineSet, LinePlot, TickLabelSet, TickMarkSet } from "scenerystack/bamboo";
import { Bounds2, Range, Vector2 } from "scenerystack/dot";
import { Orientation } from "scenerystack/phet-core";
import { Node, Text } from "scenerystack/scenery";
import { PhetFont } from "scenerystack/scenery-phet";
import RigidBodyPrecessionColors from "../../RigidBodyPrecessionColors.js";
import { PRECESSION_GRAPH_HEIGHT } from "../../RigidBodyPrecessionConstants.js";
import type { SteadyPrecessionModel } from "../model/SteadyPrecessionModel.js";

const AXIS_FONT = new PhetFont({ size: 11 });
const LEFT_MARGIN = 36;
const BOTTOM_MARGIN = 32;
const TIME_WINDOW_S = 10;

export class PrecessionAngleGraphNode extends Node {
  private readonly chartTransform: ChartTransform;
  private readonly dataPlot: LinePlot;
  private readonly predictionPlot: LinePlot;
  private readonly model: SteadyPrecessionModel;

  public constructor(model: SteadyPrecessionModel, width = 360) {
    super();
    this.model = model;

    this.localBounds = new Bounds2(0, 0, width + LEFT_MARGIN, PRECESSION_GRAPH_HEIGHT + BOTTOM_MARGIN);

    this.chartTransform = new ChartTransform({
      viewWidth: width,
      viewHeight: PRECESSION_GRAPH_HEIGHT,
      modelXRange: new Range(0, TIME_WINDOW_S),
      modelYRange: new Range(0, 4),
    });

    const chartContent = new Node({ x: LEFT_MARGIN, y: 0 });

    const chartRectangle = new ChartRectangle(this.chartTransform, {
      fill: RigidBodyPrecessionColors.graphBackgroundColorProperty,
      stroke: RigidBodyPrecessionColors.panelBorderColorProperty,
      lineWidth: 1,
      cornerRadius: 4,
    });

    const verticalGrid = new GridLineSet(this.chartTransform, Orientation.VERTICAL, 2, {
      stroke: RigidBodyPrecessionColors.graphGridColorProperty,
      lineWidth: 0.5,
    });
    const horizontalGrid = new GridLineSet(this.chartTransform, Orientation.HORIZONTAL, 1, {
      stroke: RigidBodyPrecessionColors.graphGridColorProperty,
      lineWidth: 0.5,
    });

    this.predictionPlot = new LinePlot(this.chartTransform, [], {
      stroke: RigidBodyPrecessionColors.precessionColorProperty,
      lineWidth: 1.5,
      lineDash: [6, 4],
      opacity: 0.75,
    });

    this.dataPlot = new LinePlot(this.chartTransform, [], {
      stroke: RigidBodyPrecessionColors.graphTraceColorProperty,
      lineWidth: 2.5,
    });

    const xTicks = new TickMarkSet(this.chartTransform, Orientation.HORIZONTAL, 2, { extent: 6 });
    const yTicks = new TickMarkSet(this.chartTransform, Orientation.VERTICAL, 1, { extent: 6 });
    const xLabels = new TickLabelSet(this.chartTransform, Orientation.HORIZONTAL, 2, {
      extent: 6,
      createLabel: (value) =>
        new Text(`${value}`, { font: AXIS_FONT, fill: RigidBodyPrecessionColors.textColorProperty }),
    });
    const yLabels = new TickLabelSet(this.chartTransform, Orientation.VERTICAL, 1, {
      extent: 6,
      createLabel: (value) =>
        new Text(`${value}`, { font: AXIS_FONT, fill: RigidBodyPrecessionColors.textColorProperty }),
    });

    chartContent.children = [
      chartRectangle,
      verticalGrid,
      horizontalGrid,
      this.predictionPlot,
      this.dataPlot,
      xTicks,
      yTicks,
      xLabels,
      yLabels,
    ];
    this.addChild(chartContent);

    const xTitle = new Text("t (s)", {
      font: AXIS_FONT,
      fill: RigidBodyPrecessionColors.textColorProperty,
      centerX: LEFT_MARGIN + width / 2,
      top: PRECESSION_GRAPH_HEIGHT + 16,
    });
    const yTitle = new Text("φ (rad)", {
      font: AXIS_FONT,
      fill: RigidBodyPrecessionColors.textColorProperty,
      rotation: -Math.PI / 2,
      right: 4,
      centerY: PRECESSION_GRAPH_HEIGHT / 2,
    });

    const legend = new Text("— measured   ╌╌ Ω_pred", {
      font: new PhetFont({ size: 10 }),
      fill: RigidBodyPrecessionColors.textColorProperty,
      left: LEFT_MARGIN + 4,
      top: PRECESSION_GRAPH_HEIGHT + 2,
      opacity: 0.75,
    });

    this.addChild(xTitle);
    this.addChild(yTitle);
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
      this.predictionPlot.setDataSet([]);
      return;
    }

    const latestTime = points[points.length - 1]?.x ?? 0;
    const minTime = Math.max(0, latestTime - TIME_WINDOW_S);
    const maxTime = Math.max(TIME_WINDOW_S, latestTime);
    this.chartTransform.setModelXRange(new Range(minTime, maxTime));

    const visibleAngles = points.filter((p) => p.x >= minTime).map((p) => p.y);
    const minAngle = Math.min(...visibleAngles, 0);
    const maxAngle = Math.max(...visibleAngles, 1);
    const padding = Math.max(0.15, 0.08 * (maxAngle - minAngle));
    this.chartTransform.setModelYRange(new Range(minAngle - padding, maxAngle + padding));

    this.dataPlot.setDataSet(points.map((p) => new Vector2(p.x, p.y)));

    // Dashed reference line: φ_pred(t) = φ₀ + Ω_pred · (t − t₀) anchored at latest point
    const omega = this.model.predictedPrecessionRateProperty.value;
    const phi0 = this.model.precessionAngleProperty.value;
    const t0 = latestTime;
    if (omega > 1e-9) {
      const tStart = minTime;
      const tEnd = maxTime;
      this.predictionPlot.setDataSet([
        new Vector2(tStart, phi0 + omega * (tStart - t0)),
        new Vector2(tEnd, phi0 + omega * (tEnd - t0)),
      ]);
      this.predictionPlot.visible = true;
    } else {
      this.predictionPlot.setDataSet([]);
      this.predictionPlot.visible = false;
    }
  }
}
