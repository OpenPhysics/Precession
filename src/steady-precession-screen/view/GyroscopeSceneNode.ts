/**
 * GyroscopeSceneNode.ts
 *
 * Perspective schematic of a pivoted gyroscope: stand, axle, spinning disk, arm
 * mass, tip orbit on the ground plane, and a weight arrow at the mass.
 */

import { Multilink } from "scenerystack/axon";
import { Bounds2, Vector2 } from "scenerystack/dot";
import { Shape } from "scenerystack/kite";
import { Circle, Line, Node, Path, Rectangle } from "scenerystack/scenery";
import { ArrowNode } from "scenerystack/scenery-phet";
import RigidBodyPrecessionColors from "../../RigidBodyPrecessionColors.js";
import { DISK_POSITION_FROM_PIVOT_M, PIVOT_DISTANCE_RANGE } from "../../RigidBodyPrecessionConstants.js";
import type { SteadyPrecessionModel } from "../model/SteadyPrecessionModel.js";

export const GYROSCOPE_SCENE_WIDTH = 420;
export const GYROSCOPE_SCENE_HEIGHT = 300;

const PIVOT_X = 200;
const PIVOT_Y = 210;
const AXLE_PX_PER_M = 380;
/** Foreshortening of the depth (sin φ) screen axis. */
const PERSPECTIVE = 0.55;

export class GyroscopeSceneNode extends Node {
  public constructor(model: SteadyPrecessionModel) {
    super();
    this.localBounds = new Bounds2(0, 0, GYROSCOPE_SCENE_WIDTH, GYROSCOPE_SCENE_HEIGHT);

    const ground = new Path(Shape.ellipse(PIVOT_X, PIVOT_Y + 8, 170, 28, 0), {
      fill: "rgba(15, 52, 96, 0.35)",
      stroke: RigidBodyPrecessionColors.panelBorderColorProperty,
      lineWidth: 1,
    });
    this.addChild(ground);

    const tipOrbit = new Path(new Shape(), {
      stroke: RigidBodyPrecessionColors.precessionColorProperty,
      lineWidth: 1.5,
      lineDash: [6, 5],
      opacity: 0.75,
    });
    this.addChild(tipOrbit);

    const standPost = new Rectangle(PIVOT_X - 6, PIVOT_Y, 12, 55, {
      fill: RigidBodyPrecessionColors.gyroscopeColorProperty,
      cornerRadius: 2,
    });
    const standBase = new Rectangle(PIVOT_X - 40, PIVOT_Y + 50, 80, 12, {
      fill: RigidBodyPrecessionColors.panelBorderColorProperty,
      cornerRadius: 3,
    });
    this.addChild(standPost);
    this.addChild(standBase);

    const pivot = new Circle(8, {
      fill: RigidBodyPrecessionColors.accentColorProperty,
      stroke: RigidBodyPrecessionColors.textColorProperty,
      lineWidth: 1,
      center: new Vector2(PIVOT_X, PIVOT_Y),
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

    const armMass = new Rectangle(0, 0, 22, 22, {
      fill: RigidBodyPrecessionColors.weightColorProperty,
      stroke: RigidBodyPrecessionColors.gyroscopeColorProperty,
      lineWidth: 1.5,
      cornerRadius: 4,
    });
    this.addChild(armMass);

    const weightArrow = new ArrowNode(0, 0, 0, 0, {
      headHeight: 10,
      headWidth: 10,
      tailWidth: 3,
      fill: RigidBodyPrecessionColors.weightColorProperty,
      stroke: RigidBodyPrecessionColors.weightColorProperty,
    });
    this.addChild(weightArrow);

    const tipDot = new Circle(4, { fill: RigidBodyPrecessionColors.precessionColorProperty });
    this.addChild(tipDot);

    const project = (distanceM: number, phi: number, tilt: number): Vector2 => {
      const along = distanceM * AXLE_PX_PER_M;
      return new Vector2(
        PIVOT_X + along * Math.sin(tilt) * Math.cos(phi),
        PIVOT_Y - along * Math.cos(tilt) + along * Math.sin(tilt) * Math.sin(phi) * PERSPECTIVE,
      );
    };

    const update = (): void => {
      const tilt = model.getParameters().tiltAngle;
      const phi = model.precessionAngleProperty.value;
      const spin = model.spinAngleProperty.value;
      const atCom = model.pivotAtCenterOfMassProperty.value;
      const massDistance = atCom ? DISK_POSITION_FROM_PIVOT_M : model.pivotToMassDistanceProperty.value;
      const precessing = !atCom && model.predictedPrecessionRateProperty.value > 1e-6;

      const orbitRadiusX = massDistance * AXLE_PX_PER_M * Math.sin(tilt);
      const orbitY = PIVOT_Y - massDistance * AXLE_PX_PER_M * Math.cos(tilt);
      tipOrbit.shape = Shape.ellipse(
        PIVOT_X,
        orbitY,
        Math.max(4, orbitRadiusX),
        Math.max(4, orbitRadiusX * PERSPECTIVE),
        0,
      );
      tipOrbit.visible = precessing;
      tipDot.visible = precessing;

      const tip = project(massDistance, phi, tilt);
      const diskPos = project(DISK_POSITION_FROM_PIVOT_M, phi, tilt);
      const axleEnd = project(Math.max(massDistance, PIVOT_DISTANCE_RANGE.max * 0.65), phi, tilt);

      axle.setPoint1(PIVOT_X, PIVOT_Y);
      axle.setPoint2(axleEnd.x, axleEnd.y);

      const diskRadius = 28;
      const axleAngle = Math.atan2(axleEnd.y - PIVOT_Y, axleEnd.x - PIVOT_X);
      const minor = diskRadius * (0.32 + 0.5 * Math.abs(Math.cos(tilt)));
      disk.shape = Shape.ellipse(diskPos.x, diskPos.y, diskRadius, minor, axleAngle);

      const markAngle = axleAngle + Math.PI / 2 + spin;
      const markLen = diskRadius * 0.7;
      spinMark.setPoint1(
        diskPos.x - markLen * Math.cos(markAngle),
        diskPos.y - markLen * Math.sin(markAngle) * (minor / diskRadius),
      );
      spinMark.setPoint2(
        diskPos.x + markLen * Math.cos(markAngle),
        diskPos.y + markLen * Math.sin(markAngle) * (minor / diskRadius),
      );

      armMass.center = tip;
      tipDot.center = tip;

      weightArrow.visible = !atCom;
      if (!atCom) {
        const scale = 24 + 36 * (model.armMassProperty.value / 0.5);
        weightArrow.setTailAndTip(tip.x, tip.y, tip.x, tip.y + scale);
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
