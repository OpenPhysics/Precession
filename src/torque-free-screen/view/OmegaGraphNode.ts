/**
 * OmegaGraphNode.ts
 *
 * The three body-frame components of ω against time.
 *
 * This is where the tennis-racket theorem stops being a claim about a picture and
 * becomes a measurement. Launched about a stable axis, one component sits flat and the
 * other two ripple around zero. Launched about the intermediate axis, ω₂ dives through
 * zero and comes back with the *opposite sign*, over and over, at a period you can read
 * off the axis — and the flat stretches between the flips are exactly the intervals
 * where the block looks like it is spinning normally.
 */

import { Multilink } from "scenerystack/axon";
import { ChartRectangle, ChartTransform, GridLineSet, LinePlot, TickLabelSet, TickMarkSet } from "scenerystack/bamboo";
import { Bounds2, Range, toFixed, Vector2 } from "scenerystack/dot";
import { Shape } from "scenerystack/kite";
import { Orientation } from "scenerystack/phet-core";
import { HBox, Line, Node, Text } from "scenerystack/scenery";
import { PhetFont } from "scenerystack/scenery-phet";
import { calculateTickSpacing } from "../../common/view/BambooChartUtils.js";
import RigidBodyPrecessionColors from "../../RigidBodyPrecessionColors.js";
import { TUMBLE_GRAPH_HEIGHT, TUMBLE_GRAPH_WINDOW_S, TUMBLE_SPIN_RANGE } from "../../RigidBodyPrecessionConstants.js";
import type { TorqueFreeModel } from "../model/TorqueFreeModel.js";

const Y_AXIS_GUTTER = 50;
const X_AXIS_GUTTER = 34;

const AXIS_FONT = new PhetFont({ size: 11 });
const LEGEND_FONT = new PhetFont({ size: 10 });
const TICK_LABEL_FONT = new PhetFont({ size: 10 });
const TICK_EXTENT = 6;

function legendEntry(color: typeof RigidBodyPrecessionColors.textColorProperty, label: string): Node {
  return new HBox({
    spacing: 4,
    align: "center",
    children: [
      new Line(0, 0, 16, 0, { stroke: color, lineWidth: 3 }),
      new Text(label, { font: LEGEND_FONT, fill: RigidBodyPrecessionColors.textColorProperty }),
    ],
  });
}

export class OmegaGraphNode extends Node {
  private readonly chartTransform: ChartTransform;
  private readonly plots: LinePlot[];
  private readonly verticalGrid: GridLineSet;
  private readonly horizontalGrid: GridLineSet;
  private readonly xTickMarks: TickMarkSet;
  private readonly yTickMarks: TickMarkSet;
  private readonly xTickLabels: TickLabelSet;
  private readonly yTickLabels: TickLabelSet;
  private readonly model: TorqueFreeModel;

  public constructor(model: TorqueFreeModel, width = 560) {
    super();
    this.model = model;
    this.localBounds = new Bounds2(0, 0, width + Y_AXIS_GUTTER, TUMBLE_GRAPH_HEIGHT + X_AXIS_GUTTER);

    this.chartTransform = new ChartTransform({
      viewWidth: width,
      viewHeight: TUMBLE_GRAPH_HEIGHT,
      modelXRange: new Range(0, TUMBLE_GRAPH_WINDOW_S),
      modelYRange: new Range(-TUMBLE_SPIN_RANGE.max, TUMBLE_SPIN_RANGE.max),
    });

    const chartRectangle = new ChartRectangle(this.chartTransform, {
      fill: RigidBodyPrecessionColors.graphBackgroundColorProperty,
      stroke: RigidBodyPrecessionColors.panelBorderColorProperty,
      lineWidth: 1,
      cornerRadius: 4,
    });

    const initialXSpacing = calculateTickSpacing(TUMBLE_GRAPH_WINDOW_S);
    const initialYSpacing = calculateTickSpacing(2 * TUMBLE_SPIN_RANGE.max);

    this.verticalGrid = new GridLineSet(this.chartTransform, Orientation.VERTICAL, initialXSpacing, {
      stroke: RigidBodyPrecessionColors.graphGridColorProperty,
      lineWidth: 0.5,
    });
    this.horizontalGrid = new GridLineSet(this.chartTransform, Orientation.HORIZONTAL, initialYSpacing, {
      stroke: RigidBodyPrecessionColors.graphGridColorProperty,
      lineWidth: 0.5,
    });

    // Same colors as the box faces they belong to: ω₁ is the spin about the axis
    // normal to the blue face, and so on, so the graph and the block cross-reference
    // each other without a key.
    const colors = [
      RigidBodyPrecessionColors.wheelBodyColorProperty,
      RigidBodyPrecessionColors.torqueColorProperty,
      RigidBodyPrecessionColors.weightColorProperty,
    ];
    this.plots = colors.map((color) => new LinePlot(this.chartTransform, [], { stroke: color, lineWidth: 2 }));

    const clipped = new Node({
      clipArea: Shape.bounds(new Bounds2(0, 0, width, TUMBLE_GRAPH_HEIGHT)),
      children: [chartRectangle, this.verticalGrid, this.horizontalGrid, ...this.plots],
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
        new Text(toFixed(value, 0), {
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

    this.addChild(
      new Node({
        translation: new Vector2(Y_AXIS_GUTTER, 0),
        children: [clipped, this.xTickMarks, this.yTickMarks, this.xTickLabels, this.yTickLabels],
      }),
    );

    this.addChild(
      new Text("ω (rad/s)", {
        font: AXIS_FONT,
        fill: RigidBodyPrecessionColors.textColorProperty,
        rotation: -Math.PI / 2,
        centerY: TUMBLE_GRAPH_HEIGHT / 2,
        right: Y_AXIS_GUTTER - 26,
      }),
    );
    this.addChild(
      new Text("t (s)", {
        font: AXIS_FONT,
        fill: RigidBodyPrecessionColors.textColorProperty,
        centerX: Y_AXIS_GUTTER + width / 2,
        top: TUMBLE_GRAPH_HEIGHT + 16,
      }),
    );

    this.addChild(
      new HBox({
        spacing: 12,
        align: "center",
        children: [
          legendEntry(RigidBodyPrecessionColors.wheelBodyColorProperty, "ω₁ (max I)"),
          legendEntry(RigidBodyPrecessionColors.torqueColorProperty, "ω₂ (intermediate)"),
          legendEntry(RigidBodyPrecessionColors.weightColorProperty, "ω₃ (min I)"),
        ],
        right: Y_AXIS_GUTTER + width,
        top: TUMBLE_GRAPH_HEIGHT + 15,
      }),
    );

    Multilink.multilink([model.omegaProperty], () => this.updatePlot());
    this.updatePlot();
  }

  private updatePlot(): void {
    const history = this.model.getHistory();
    if (history.length === 0) {
      for (const plot of this.plots) {
        plot.setDataSet([]);
      }
      return;
    }

    const latest = history[history.length - 1]?.t ?? 0;
    const minTime = Math.max(0, latest - TUMBLE_GRAPH_WINDOW_S);
    const maxTime = Math.max(TUMBLE_GRAPH_WINDOW_S, latest);
    const xRange = new Range(minTime, maxTime);
    this.chartTransform.setModelXRange(xRange);

    // A fixed symmetric y range: the whole point is that ω₂ crosses zero and changes
    // sign, so an autoscaling axis that hid the zero line would undercut the reading.
    const peak = Math.max(...history.map((s) => Math.max(Math.abs(s.x), Math.abs(s.y), Math.abs(s.z))), 1);
    const yRange = new Range(-peak * 1.15, peak * 1.15);
    this.chartTransform.setModelYRange(yRange);

    const xSpacing = calculateTickSpacing(xRange.getLength());
    const ySpacing = calculateTickSpacing(yRange.getLength());
    this.verticalGrid.setSpacing(xSpacing);
    this.horizontalGrid.setSpacing(ySpacing);
    this.xTickMarks.setSpacing(xSpacing);
    this.yTickMarks.setSpacing(ySpacing);
    this.xTickLabels.setSpacing(xSpacing);
    this.yTickLabels.setSpacing(ySpacing);

    const pick: Array<(sample: { x: number; y: number; z: number }) => number> = [
      (sample) => sample.x,
      (sample) => sample.y,
      (sample) => sample.z,
    ];
    this.plots.forEach((plot, index) => {
      const accessor = pick[index];
      if (!accessor) {
        return;
      }
      plot.setDataSet(history.map((sample) => new Vector2(sample.t, accessor(sample))));
    });
  }
}
