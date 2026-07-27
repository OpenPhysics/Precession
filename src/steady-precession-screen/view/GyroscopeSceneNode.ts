/**
 * GyroscopeSceneNode.ts
 *
 * Perspective schematic of a pivoted gyroscope with a top-down precession inset.
 */

import { Multilink } from "scenerystack/axon";
import { Bounds2, Vector2 } from "scenerystack/dot";
import { Shape } from "scenerystack/kite";
import { Circle, Line, Node, Path, Rectangle, Text } from "scenerystack/scenery";
import { ArrowNode, PhetFont } from "scenerystack/scenery-phet";
import { computeAxleGeometry, projectAxlePoint } from "../../common/rigid-body/GyroscopeKinematics.js";
import RigidBodyPrecessionColors from "../../RigidBodyPrecessionColors.js";
import { DISK_POSITION_FROM_PIVOT_M, PIVOT_DISTANCE_RANGE } from "../../RigidBodyPrecessionConstants.js";
import type { SteadyPrecessionModel } from "../model/SteadyPrecessionModel.js";

export const GYROSCOPE_SCENE_WIDTH = 400;
export const GYROSCOPE_SCENE_HEIGHT = 290;

const PIVOT = new Vector2(185, 200);
const AXLE_PX_PER_M = 360;
const PERSPECTIVE = 0.5;

const INSET_SIZE = 72;
const INSET_MARGIN = 8;

export class GyroscopeSceneNode extends Node {
  public constructor(model: SteadyPrecessionModel) {
    super();
    this.localBounds = new Bounds2(0, 0, GYROSCOPE_SCENE_WIDTH, GYROSCOPE_SCENE_HEIGHT);

    const ground = new Path(Shape.ellipse(PIVOT.x, PIVOT.y + 6, 155, 24, 0), {
      fill: "rgba(15, 52, 96, 0.4)",
      stroke: RigidBodyPrecessionColors.panelBorderColorProperty,
      lineWidth: 1,
    });
    this.addChild(ground);

    const tipOrbit = new Path(new Shape(), {
      stroke: RigidBodyPrecessionColors.precessionColorProperty,
      lineWidth: 1.5,
      lineDash: [5, 4],
      opacity: 0.8,
    });
    this.addChild(tipOrbit);

    const standPost = new Rectangle(PIVOT.x - 5, PIVOT.y, 10, 48, {
      fill: RigidBodyPrecessionColors.gyroscopeColorProperty,
      cornerRadius: 2,
    });
    const standBase = new Rectangle(PIVOT.x - 36, PIVOT.y + 44, 72, 10, {
      fill: RigidBodyPrecessionColors.panelBorderColorProperty,
      cornerRadius: 3,
    });
    this.addChild(standPost);
    this.addChild(standBase);

    const pivot = new Circle(7, {
      fill: RigidBodyPrecessionColors.accentColorProperty,
      stroke: RigidBodyPrecessionColors.textColorProperty,
      lineWidth: 1,
      center: PIVOT,
    });
    this.addChild(pivot);

    const axle = new Line(0, 0, 0, 0, {
      stroke: RigidBodyPrecessionColors.gyroscopeColorProperty,
      lineWidth: 5,
      lineCap: "round",
    });
    this.addChild(axle);

    const disk = new Path(new Shape(), {
      fill: RigidBodyPrecessionColors.angularMomentumColorProperty,
      stroke: RigidBodyPrecessionColors.gyroscopeColorProperty,
      lineWidth: 2,
    });
    this.addChild(disk);

    const spinMark = new Line(0, 0, 0, 0, {
      stroke: RigidBodyPrecessionColors.backgroundColorProperty,
      lineWidth: 2.5,
      lineCap: "round",
    });
    this.addChild(spinMark);

    const armMass = new Rectangle(0, 0, 20, 20, {
      fill: RigidBodyPrecessionColors.weightColorProperty,
      stroke: RigidBodyPrecessionColors.gyroscopeColorProperty,
      lineWidth: 1.5,
      cornerRadius: 4,
    });
    this.addChild(armMass);

    const weightArrow = new ArrowNode(0, 0, 0, 0, {
      headHeight: 9,
      headWidth: 9,
      tailWidth: 2.5,
      fill: RigidBodyPrecessionColors.weightColorProperty,
      stroke: RigidBodyPrecessionColors.weightColorProperty,
    });
    this.addChild(weightArrow);

    const tipDot = new Circle(4, { fill: RigidBodyPrecessionColors.precessionColorProperty });
    this.addChild(tipDot);

    // Top-down inset: precession circle viewed from above
    const insetX = GYROSCOPE_SCENE_WIDTH - INSET_SIZE - INSET_MARGIN;
    const insetY = INSET_MARGIN;
    const insetCenter = new Vector2(insetX + INSET_SIZE / 2, insetY + INSET_SIZE / 2);
    const insetRadius = INSET_SIZE / 2 - 6;

    const insetCard = new Rectangle(insetX, insetY, INSET_SIZE, INSET_SIZE, {
      fill: "rgba(15, 26, 46, 0.7)",
      stroke: RigidBodyPrecessionColors.panelBorderColorProperty,
      lineWidth: 1,
      cornerRadius: 6,
    });
    const insetOrbit = new Circle(insetRadius, {
      fill: "transparent",
      stroke: RigidBodyPrecessionColors.precessionColorProperty,
      lineWidth: 1,
      lineDash: [3, 3],
      center: insetCenter,
    });
    const insetDot = new Circle(5, { fill: RigidBodyPrecessionColors.precessionColorProperty });
    const insetLabel = new Text("top view", {
      font: new PhetFont({ size: 9 }),
      fill: RigidBodyPrecessionColors.textColorProperty,
      centerX: insetCenter.x,
      top: insetY + 4,
      opacity: 0.7,
    });
    this.addChild(insetCard);
    this.addChild(insetOrbit);
    this.addChild(insetDot);
    this.addChild(insetLabel);

    const update = (): void => {
      const tilt = model.getParameters().tiltAngle;
      const phi = model.precessionAngleProperty.value;
      const spin = model.spinAngleProperty.value;
      const atCom = model.pivotAtCenterOfMassProperty.value;
      const massDistance = atCom ? DISK_POSITION_FROM_PIVOT_M : model.pivotToMassDistanceProperty.value;
      const precessing = !atCom && model.predictedPrecessionRateProperty.value > 1e-6;

      const geom = computeAxleGeometry(
        PIVOT,
        phi,
        tilt,
        massDistance,
        DISK_POSITION_FROM_PIVOT_M,
        AXLE_PX_PER_M,
        PERSPECTIVE,
      );

      tipOrbit.shape = Shape.ellipse(
        geom.orbitCenter.x,
        geom.orbitCenter.y,
        Math.max(3, geom.orbitRadiusX),
        Math.max(3, geom.orbitRadiusY),
        0,
      );
      tipOrbit.visible = precessing;
      tipDot.visible = precessing;

      const axleEnd = projectAxlePoint(
        PIVOT,
        Math.max(massDistance, PIVOT_DISTANCE_RANGE.max * 0.6),
        phi,
        tilt,
        AXLE_PX_PER_M,
        PERSPECTIVE,
      );
      axle.setPoint1(PIVOT.x, PIVOT.y);
      axle.setPoint2(axleEnd.x, axleEnd.y);

      const diskRadius = 26;
      const minor = diskRadius * (0.3 + 0.55 * Math.abs(Math.cos(tilt)));
      disk.shape = Shape.ellipse(geom.diskCenter.x, geom.diskCenter.y, diskRadius, minor, geom.axleAngle);

      const markAngle = geom.axleAngle + Math.PI / 2 + spin;
      const markLen = diskRadius * 0.72;
      spinMark.setPoint1(
        geom.diskCenter.x - markLen * Math.cos(markAngle),
        geom.diskCenter.y - markLen * Math.sin(markAngle) * (minor / diskRadius),
      );
      spinMark.setPoint2(
        geom.diskCenter.x + markLen * Math.cos(markAngle),
        geom.diskCenter.y + markLen * Math.sin(markAngle) * (minor / diskRadius),
      );

      armMass.center = geom.massTip;
      tipDot.center = geom.massTip;

      weightArrow.visible = !atCom;
      if (!atCom) {
        const scale = 22 + 34 * (model.armMassProperty.value / 0.5);
        weightArrow.setTailAndTip(geom.massTip.x, geom.massTip.y, geom.massTip.x, geom.massTip.y + scale);
      }

      // Top-down inset dot on the precession circle
      insetOrbit.visible = precessing;
      insetDot.visible = precessing;
      if (precessing) {
        insetDot.center = new Vector2(
          insetCenter.x + insetRadius * Math.cos(phi),
          insetCenter.y + insetRadius * Math.sin(phi),
        );
      }
    };

    Multilink.multilink(
      [
        model.precessionAngleProperty,
        model.spinAngleProperty,
        model.pivotToMassDistanceProperty,
        model.pivotAtCenterOfMassProperty,
        model.armMassProperty,
        model.predictedPrecessionRateProperty,
      ],
      update,
    );
    update();
  }
}
