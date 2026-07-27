/**
 * VectorDiagramNode.ts
 *
 * Live vector diagram for Screen 1. Makes visceral the core insight:
 * weight pulls down at the mass, but torque is perpendicular to L — so the
 * axle tip moves sideways, not down.
 */

import { Multilink } from "scenerystack/axon";
import { Bounds2, Vector2 } from "scenerystack/dot";
import { Shape } from "scenerystack/kite";
import { Circle, Line, Node, Path, Rectangle, Text, VBox } from "scenerystack/scenery";
import { ArrowNode, PhetFont } from "scenerystack/scenery-phet";
import { StringManager } from "../../i18n/StringManager.js";
import RigidBodyPrecessionColors from "../../RigidBodyPrecessionColors.js";
import type { SteadyPrecessionModel } from "../model/SteadyPrecessionModel.js";

export const VECTOR_DIAGRAM_WIDTH = 280;
export const VECTOR_DIAGRAM_HEIGHT = 300;

const ORIGIN_X = 130;
const ORIGIN_Y = 155;
const LABEL_FONT = new PhetFont({ size: 15, weight: "bold" });
const LEGEND_FONT = new PhetFont({ size: 11 });
const INSIGHT_FONT = new PhetFont({ size: 12 });
const ARROW_OPTIONS = {
  headHeight: 11,
  headWidth: 11,
  tailWidth: 3,
  doubleHead: false,
} as const;

function legendRow(colorProperty: typeof RigidBodyPrecessionColors.weightColorProperty, label: string): Node {
  const swatch = new Rectangle(0, 0, 14, 3, {
    fill: colorProperty,
    centerY: 0,
  });
  const text = new Text(label, {
    font: LEGEND_FONT,
    fill: colorProperty,
    left: 20,
    centerY: 0,
  });
  return new Node({ children: [swatch, text] });
}

export class VectorDiagramNode extends Node {
  public constructor(model: SteadyPrecessionModel) {
    super();
    this.localBounds = new Bounds2(0, 0, VECTOR_DIAGRAM_WIDTH, VECTOR_DIAGRAM_HEIGHT);

    const strings = StringManager.getInstance().getSteadyPrecessionStrings();

    const title = new Text(strings.vectorDiagramTitleStringProperty, {
      font: new PhetFont({ size: 14, weight: "bold" }),
      fill: RigidBodyPrecessionColors.textColorProperty,
      left: 8,
      top: 6,
      maxWidth: VECTOR_DIAGRAM_WIDTH - 16,
    });
    this.addChild(title);

    const card = new Rectangle(4, 28, VECTOR_DIAGRAM_WIDTH - 8, VECTOR_DIAGRAM_HEIGHT - 36, {
      fill: "rgba(15, 26, 46, 0.55)",
      stroke: RigidBodyPrecessionColors.panelBorderColorProperty,
      lineWidth: 1,
      cornerRadius: 8,
    });
    this.addChild(card);

    const insight = new Text(strings.vectorInsightStringProperty, {
      font: INSIGHT_FONT,
      fill: RigidBodyPrecessionColors.textColorProperty,
      left: 12,
      top: 34,
      maxWidth: VECTOR_DIAGRAM_WIDTH - 24,
    });
    this.addChild(insight);

    const lOrbit = new Path(new Shape(), {
      stroke: RigidBodyPrecessionColors.precessionColorProperty,
      lineWidth: 1,
      lineDash: [4, 4],
      opacity: 0.55,
    });
    this.addChild(lOrbit);

    const verticalAxis = new Line(ORIGIN_X, ORIGIN_Y - 90, ORIGIN_X, ORIGIN_Y + 65, {
      stroke: RigidBodyPrecessionColors.panelBorderColorProperty,
      lineWidth: 1,
      lineDash: [3, 4],
    });
    this.addChild(verticalAxis);

    const axleLine = new Line(0, 0, 0, 0, {
      stroke: RigidBodyPrecessionColors.gyroscopeColorProperty,
      lineWidth: 3,
      lineCap: "round",
    });
    this.addChild(axleLine);

    const pivot = new Circle(5, {
      fill: RigidBodyPrecessionColors.accentColorProperty,
      center: new Vector2(ORIGIN_X, ORIGIN_Y),
    });
    this.addChild(pivot);

    const weightArrow = new ArrowNode(0, 0, 0, 0, {
      ...ARROW_OPTIONS,
      fill: RigidBodyPrecessionColors.weightColorProperty,
      stroke: RigidBodyPrecessionColors.weightColorProperty,
    });
    const torqueArrow = new ArrowNode(0, 0, 0, 0, {
      ...ARROW_OPTIONS,
      fill: RigidBodyPrecessionColors.torqueColorProperty,
      stroke: RigidBodyPrecessionColors.torqueColorProperty,
    });
    const momentumArrow = new ArrowNode(0, 0, 0, 0, {
      ...ARROW_OPTIONS,
      fill: RigidBodyPrecessionColors.angularMomentumColorProperty,
      stroke: RigidBodyPrecessionColors.angularMomentumColorProperty,
    });
    const precessionArrow = new ArrowNode(0, 0, 0, 0, {
      ...ARROW_OPTIONS,
      fill: RigidBodyPrecessionColors.precessionColorProperty,
      stroke: RigidBodyPrecessionColors.precessionColorProperty,
    });

    const weightLabel = new Text("mg", { font: LABEL_FONT, fill: RigidBodyPrecessionColors.weightColorProperty });
    const torqueLabel = new Text("τ", { font: LABEL_FONT, fill: RigidBodyPrecessionColors.torqueColorProperty });
    const momentumLabel = new Text("L", {
      font: LABEL_FONT,
      fill: RigidBodyPrecessionColors.angularMomentumColorProperty,
    });
    const precessionLabel = new Text("Ω", {
      font: LABEL_FONT,
      fill: RigidBodyPrecessionColors.precessionColorProperty,
    });

    this.addChild(momentumArrow);
    this.addChild(weightArrow);
    this.addChild(torqueArrow);
    this.addChild(precessionArrow);
    this.addChild(weightLabel);
    this.addChild(torqueLabel);
    this.addChild(momentumLabel);
    this.addChild(precessionLabel);

    const legend = new VBox({
      spacing: 3,
      align: "left",
      children: [
        legendRow(RigidBodyPrecessionColors.weightColorProperty, "mg  weight"),
        legendRow(RigidBodyPrecessionColors.angularMomentumColorProperty, "L   spin angular momentum"),
        legendRow(RigidBodyPrecessionColors.torqueColorProperty, "τ   torque = r × F"),
        legendRow(RigidBodyPrecessionColors.precessionColorProperty, "Ω   precession"),
      ],
      left: 12,
      bottom: VECTOR_DIAGRAM_HEIGHT - 12,
    });
    this.addChild(legend);

    const update = (): void => {
      const vectors = model.getVectors();
      const tilt = model.getParameters().tiltAngle;
      const phi = model.precessionAngleProperty.value;
      const atCom = model.pivotAtCenterOfMassProperty.value;
      const hasTorque = vectors.torqueMagnitude > 1e-9;

      const axleLength = 95;
      const axleTip = new Vector2(
        ORIGIN_X + axleLength * Math.sin(tilt) * Math.cos(phi),
        ORIGIN_Y - axleLength * Math.cos(tilt),
      );
      axleLine.setPoint1(ORIGIN_X, ORIGIN_Y);
      axleLine.setPoint2(axleTip.x, axleTip.y);

      const lScale = 78;
      const lTip = new Vector2(ORIGIN_X + lScale * Math.sin(tilt) * Math.cos(phi), ORIGIN_Y - lScale * Math.cos(tilt));
      momentumArrow.setTailAndTip(ORIGIN_X, ORIGIN_Y, lTip.x, lTip.y);
      momentumLabel.left = lTip.x + 6;
      momentumLabel.centerY = lTip.y - 4;

      const orbitR = lScale * Math.sin(tilt);
      const orbitY = ORIGIN_Y - lScale * Math.cos(tilt);
      lOrbit.shape = Shape.ellipse(ORIGIN_X, orbitY, Math.max(4, orbitR), Math.max(3, orbitR * 0.28), 0);
      lOrbit.visible = hasTorque;

      weightArrow.visible = !atCom;
      weightLabel.visible = !atCom;
      if (!atCom) {
        weightArrow.setTailAndTip(axleTip.x, axleTip.y, axleTip.x, axleTip.y + 48);
        weightLabel.left = axleTip.x + 8;
        weightLabel.top = axleTip.y + 28;
      }

      // τ attached at the tip of L, tangential to the precession circle of L
      torqueArrow.visible = hasTorque;
      torqueLabel.visible = hasTorque;
      if (hasTorque) {
        const tauLen = 52;
        const tauTip = new Vector2(lTip.x + tauLen * Math.cos(phi + Math.PI / 2), lTip.y);
        torqueArrow.setTailAndTip(lTip.x, lTip.y, tauTip.x, tauTip.y);
        torqueLabel.left = tauTip.x + (tauTip.x >= lTip.x ? 4 : -16);
        torqueLabel.centerY = tauTip.y - 2;

        precessionArrow.setTailAndTip(ORIGIN_X, ORIGIN_Y, ORIGIN_X, ORIGIN_Y - 50);
        precessionLabel.left = ORIGIN_X + 8;
        precessionLabel.bottom = ORIGIN_Y - 52;
      }
      precessionArrow.visible = hasTorque;
      precessionLabel.visible = hasTorque;
    };

    Multilink.multilink(
      [
        model.precessionAngleProperty,
        model.spinRateProperty,
        model.armMassProperty,
        model.pivotToMassDistanceProperty,
        model.pivotAtCenterOfMassProperty,
        model.actualSpinRateProperty,
      ],
      update,
    );
    update();
  }
}
