/**
 * VectorDiagramNode.ts
 *
 * Live vector diagram: mg down at the mass, L along the axle, τ ⊥ L at the
 * tip of L (direction of dL/dt), Ω vertical.
 */

import { Multilink } from "scenerystack/axon";
import { Bounds2, Vector2 } from "scenerystack/dot";
import { Shape } from "scenerystack/kite";
import { Circle, Line, Node, Path, Rectangle, Text, VBox } from "scenerystack/scenery";
import { ArrowNode, PhetFont } from "scenerystack/scenery-phet";
import { computeVectorDiagramGeometry } from "../../common/rigid-body/GyroscopeKinematics.js";
import { StringManager } from "../../i18n/StringManager.js";
import RigidBodyPrecessionColors from "../../RigidBodyPrecessionColors.js";
import type { SteadyPrecessionModel } from "../model/SteadyPrecessionModel.js";

export const VECTOR_DIAGRAM_WIDTH = 270;
export const VECTOR_DIAGRAM_HEIGHT = 290;

const ORIGIN = new Vector2(125, 148);
const AXLE_LENGTH = 88;
const MOMENTUM_LENGTH = 72;
const LABEL_FONT = new PhetFont({ size: 14, weight: "bold" });
const LEGEND_FONT = new PhetFont({ size: 10 });
const INSIGHT_FONT = new PhetFont({ size: 11 });
const ARROW = { headHeight: 10, headWidth: 10, tailWidth: 2.5, doubleHead: false } as const;

function legendRow(color: typeof RigidBodyPrecessionColors.weightColorProperty, label: string): Node {
  return new Node({
    children: [
      new Rectangle(0, 0, 12, 3, { fill: color, centerY: 0 }),
      new Text(label, { font: LEGEND_FONT, fill: color, left: 16, centerY: 0 }),
    ],
  });
}

/** Small right-angle bracket between two vectors meeting at `corner`. */
function rightAngleMarker(corner: Vector2, alongA: Vector2, alongB: Vector2, size: number): Path {
  const a = alongA.normalized();
  const b = alongB.normalized();
  const p1 = corner.plus(a.times(size));
  const p2 = corner.plus(a.times(size)).plus(b.times(size));
  const p3 = corner.plus(b.times(size));
  const s = new Shape();
  s.moveTo(p1.x, p1.y).lineTo(p2.x, p2.y).lineTo(p3.x, p3.y);
  return new Path(s, {
    stroke: RigidBodyPrecessionColors.textColorProperty,
    lineWidth: 1,
    opacity: 0.6,
  });
}

export class VectorDiagramNode extends Node {
  public constructor(model: SteadyPrecessionModel) {
    super();
    this.localBounds = new Bounds2(0, 0, VECTOR_DIAGRAM_WIDTH, VECTOR_DIAGRAM_HEIGHT);

    const strings = StringManager.getInstance().getSteadyPrecessionStrings();

    const insight = new Text(strings.vectorInsightStringProperty, {
      font: INSIGHT_FONT,
      fill: RigidBodyPrecessionColors.textColorProperty,
      left: 8,
      top: 4,
      maxWidth: VECTOR_DIAGRAM_WIDTH - 16,
    });
    this.addChild(insight);

    const lOrbit = new Path(new Shape(), {
      stroke: RigidBodyPrecessionColors.precessionColorProperty,
      lineWidth: 1,
      lineDash: [3, 3],
      opacity: 0.5,
    });
    this.addChild(lOrbit);

    const verticalAxis = new Line(ORIGIN.x, ORIGIN.y - 80, ORIGIN.x, ORIGIN.y + 60, {
      stroke: RigidBodyPrecessionColors.panelBorderColorProperty,
      lineWidth: 1,
      lineDash: [3, 4],
    });
    this.addChild(verticalAxis);

    const axleLine = new Line(0, 0, 0, 0, {
      stroke: RigidBodyPrecessionColors.gyroscopeColorProperty,
      lineWidth: 3,
      lineCap: "round",
      opacity: 0.5,
    });
    this.addChild(axleLine);

    const pivot = new Circle(5, {
      fill: RigidBodyPrecessionColors.accentColorProperty,
      center: ORIGIN,
    });
    this.addChild(pivot);

    const weightArrow = new ArrowNode(0, 0, 0, 0, {
      ...ARROW,
      fill: RigidBodyPrecessionColors.weightColorProperty,
      stroke: RigidBodyPrecessionColors.weightColorProperty,
    });
    const torqueArrow = new ArrowNode(0, 0, 0, 0, {
      ...ARROW,
      fill: RigidBodyPrecessionColors.torqueColorProperty,
      stroke: RigidBodyPrecessionColors.torqueColorProperty,
    });
    const momentumArrow = new ArrowNode(0, 0, 0, 0, {
      ...ARROW,
      fill: RigidBodyPrecessionColors.angularMomentumColorProperty,
      stroke: RigidBodyPrecessionColors.angularMomentumColorProperty,
    });
    const precessionArrow = new ArrowNode(0, 0, 0, 0, {
      ...ARROW,
      fill: RigidBodyPrecessionColors.precessionColorProperty,
      stroke: RigidBodyPrecessionColors.precessionColorProperty,
    });

    const rightAngle = new Path(new Shape(), {
      stroke: RigidBodyPrecessionColors.textColorProperty,
      lineWidth: 1,
      opacity: 0.55,
    });

    const weightLabel = new Text("mg", { font: LABEL_FONT, fill: RigidBodyPrecessionColors.weightColorProperty });
    const torqueLabel = new Text("τ = dL/dt", {
      font: new PhetFont({ size: 11, weight: "bold" }),
      fill: RigidBodyPrecessionColors.torqueColorProperty,
    });
    const momentumLabel = new Text("L", {
      font: LABEL_FONT,
      fill: RigidBodyPrecessionColors.angularMomentumColorProperty,
    });
    const precessionLabel = new Text("Ω", {
      font: LABEL_FONT,
      fill: RigidBodyPrecessionColors.precessionColorProperty,
    });

    const noTorqueMessage = new Text(strings.noTorqueMessageStringProperty, {
      font: INSIGHT_FONT,
      fill: RigidBodyPrecessionColors.textColorProperty,
      center: new Vector2(VECTOR_DIAGRAM_WIDTH / 2, ORIGIN.y),
      maxWidth: VECTOR_DIAGRAM_WIDTH - 24,
      visible: false,
    });

    this.addChild(momentumArrow);
    this.addChild(weightArrow);
    this.addChild(torqueArrow);
    this.addChild(precessionArrow);
    this.addChild(rightAngle);
    this.addChild(weightLabel);
    this.addChild(torqueLabel);
    this.addChild(momentumLabel);
    this.addChild(precessionLabel);
    this.addChild(noTorqueMessage);

    const legend = new VBox({
      spacing: 2,
      align: "left",
      children: [
        legendRow(RigidBodyPrecessionColors.weightColorProperty, "mg"),
        legendRow(RigidBodyPrecessionColors.angularMomentumColorProperty, "L"),
        legendRow(RigidBodyPrecessionColors.torqueColorProperty, "τ ⊥ L"),
        legendRow(RigidBodyPrecessionColors.precessionColorProperty, "Ω"),
      ],
      left: 8,
      bottom: VECTOR_DIAGRAM_HEIGHT - 6,
    });
    this.addChild(legend);

    const vectorNodes = [
      axleLine,
      momentumArrow,
      weightArrow,
      torqueArrow,
      precessionArrow,
      rightAngle,
      weightLabel,
      torqueLabel,
      momentumLabel,
      precessionLabel,
      lOrbit,
    ];

    const update = (): void => {
      const vectors = model.getVectors();
      const tilt = model.getParameters().tiltAngle;
      const phi = model.precessionAngleProperty.value;
      const atCom = model.pivotAtCenterOfMassProperty.value;
      const hasTorque = !atCom && vectors.torqueMagnitude > 1e-9;

      const geom = computeVectorDiagramGeometry(ORIGIN, phi, tilt, AXLE_LENGTH, MOMENTUM_LENGTH, hasTorque);

      noTorqueMessage.visible = atCom;
      for (const n of vectorNodes) {
        n.visible = !atCom;
      }
      if (atCom) {
        return;
      }

      axleLine.setPoint1(ORIGIN.x, ORIGIN.y);
      axleLine.setPoint2(geom.axleTip.x, geom.axleTip.y);

      momentumArrow.setTailAndTip(ORIGIN.x, ORIGIN.y, geom.momentumTip.x, geom.momentumTip.y);
      momentumLabel.left = geom.momentumTip.x + 5;
      momentumLabel.centerY = geom.momentumTip.y - 3;

      lOrbit.shape = Shape.ellipse(
        geom.orbitCenter.x,
        geom.orbitCenter.y,
        Math.max(3, geom.orbitRadius),
        Math.max(2, geom.orbitRadius * 0.25),
        0,
      );
      lOrbit.visible = hasTorque;

      // Weight at mass tip, straight down
      weightArrow.setTailAndTip(geom.axleTip.x, geom.axleTip.y, geom.axleTip.x, geom.axleTip.y + 44);
      weightLabel.left = geom.axleTip.x + 6;
      weightLabel.top = geom.axleTip.y + 24;

      torqueArrow.visible = hasTorque;
      torqueLabel.visible = hasTorque;
      rightAngle.visible = hasTorque;
      precessionArrow.visible = hasTorque;
      precessionLabel.visible = hasTorque;

      if (hasTorque) {
        const tauLen = 48;
        const tauTip = geom.momentumTip.plus(geom.torqueDirection.times(tauLen));
        torqueArrow.setTailAndTip(geom.momentumTip.x, geom.momentumTip.y, tauTip.x, tauTip.y);
        torqueLabel.left = tauTip.x + (geom.torqueDirection.x >= 0 ? 3 : -52);
        torqueLabel.centerY = tauTip.y - 2;

        // Right-angle marker between L and τ at the tip of L
        const lDir = geom.momentumTip.minus(ORIGIN);
        rightAngle.shape = rightAngleMarker(geom.momentumTip, lDir, geom.torqueDirection, 12).shape ?? new Shape();

        precessionArrow.setTailAndTip(ORIGIN.x, ORIGIN.y, ORIGIN.x, ORIGIN.y - 46);
        precessionLabel.left = ORIGIN.x + 6;
        precessionLabel.bottom = ORIGIN.y - 48;
      }
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
