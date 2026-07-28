/**
 * TopSceneNode.ts
 *
 * Perspective view of the heavy symmetric top: the pivoted wheel, the path its
 * axle tip traces on the sphere, and the [θ_min, θ_max] band that path is
 * confined to. The trace is the payoff of the full dynamics — cusps, loops, and
 * smooth waves are all the same equations released three different ways.
 */

import { Multilink } from "scenerystack/axon";
import { Bounds2, Vector2 } from "scenerystack/dot";
import { Shape } from "scenerystack/kite";
import { Circle, Line, Node, Path, Rectangle, Text } from "scenerystack/scenery";
import { PhetFont } from "scenerystack/scenery-phet";
import {
  projectAxisPoint,
  projectRimPoint,
  projectTiltCircle,
  type TopProjection,
  wheelRimPoints,
  wheelSilhouette,
} from "../../common/view/TopProjection.js";
import RigidBodyPrecessionColors from "../../RigidBodyPrecessionColors.js";
import {
  NUTATION_COM_DISTANCE_M,
  NUTATION_TRACE_DRAW_SAMPLES,
  NUTATION_WHEEL_RADIUS_M,
} from "../../RigidBodyPrecessionConstants.js";
import type { NutationModel } from "../model/NutationModel.js";

export const TOP_SCENE_WIDTH = 420;
export const TOP_SCENE_HEIGHT = 345;

/**
 * Drawn length of the axle beyond the wheel (m). Visual only — the dynamics depend on
 * the inertias and the center-of-mass distance, not on where the axle ends. It is long
 * enough that the traced tip circle clears the wheel rim at every tilt in range.
 */
const AXLE_LENGTH_M = 0.85;

const PROJECTION: TopProjection = {
  pivot: new Vector2(210, 235),
  pxPerM: 165,
  perspective: 0.45,
};

const LABEL_FONT = new PhetFont({ size: 10 });

function bandShape(theta: number): Shape {
  const circle = projectTiltCircle(PROJECTION, theta, AXLE_LENGTH_M);
  return Shape.ellipse(circle.center.x, circle.center.y, Math.max(1, circle.radiusX), Math.max(1, circle.radiusY), 0);
}

export class TopSceneNode extends Node {
  public constructor(model: NutationModel) {
    super();
    this.localBounds = new Bounds2(0, 0, TOP_SCENE_WIDTH, TOP_SCENE_HEIGHT);

    const pivot = PROJECTION.pivot;

    const ground = new Path(Shape.ellipse(pivot.x, pivot.y + 62, 150, 22, 0), {
      fill: RigidBodyPrecessionColors.sceneGroundColorProperty,
      stroke: RigidBodyPrecessionColors.panelBorderColorProperty,
      lineWidth: 1,
    });
    this.addChild(ground);

    // Vertical reference: θ is measured from this line.
    const verticalAxis = new Line(pivot.x, pivot.y - 200, pivot.x, pivot.y, {
      stroke: RigidBodyPrecessionColors.textColorProperty,
      lineWidth: 1,
      lineDash: [4, 5],
      opacity: 0.45,
    });
    this.addChild(verticalAxis);

    // Turning-point circles: the axis tip can never leave the band between them.
    const bandMin = new Path(new Shape(), {
      stroke: RigidBodyPrecessionColors.nutationBandColorProperty,
      lineWidth: 1.5,
      lineDash: [6, 5],
      opacity: 0.9,
    });
    const bandMax = new Path(new Shape(), {
      stroke: RigidBodyPrecessionColors.nutationBandColorProperty,
      lineWidth: 1.5,
      lineDash: [6, 5],
      opacity: 0.9,
    });
    this.addChild(bandMin);
    this.addChild(bandMax);

    const tipTrace = new Path(new Shape(), {
      stroke: RigidBodyPrecessionColors.tipTraceColorProperty,
      lineWidth: 2,
      lineJoin: "round",
    });
    this.addChild(tipTrace);

    const support = new Rectangle(pivot.x - 5, pivot.y, 10, 56, {
      fill: RigidBodyPrecessionColors.gyroscopeColorProperty,
      cornerRadius: 2,
    });
    const supportBase = new Rectangle(pivot.x - 34, pivot.y + 52, 68, 10, {
      fill: RigidBodyPrecessionColors.panelBorderColorProperty,
      cornerRadius: 3,
    });
    this.addChild(support);
    this.addChild(supportBase);

    const axle = new Line(0, 0, 0, 0, {
      stroke: RigidBodyPrecessionColors.gyroscopeColorProperty,
      lineWidth: 4,
      lineCap: "round",
    });
    this.addChild(axle);

    const hub = new Path(new Shape(), {
      fill: RigidBodyPrecessionColors.gyroscopeColorProperty,
      opacity: 0.55,
    });
    this.addChild(hub);

    const wheel = new Path(new Shape(), {
      fill: RigidBodyPrecessionColors.wheelFillColorProperty,
      stroke: RigidBodyPrecessionColors.angularMomentumColorProperty,
      lineWidth: 3,
    });
    this.addChild(wheel);

    const spinSpoke = new Line(0, 0, 0, 0, {
      stroke: RigidBodyPrecessionColors.weightColorProperty,
      lineWidth: 3,
      lineCap: "round",
    });
    this.addChild(spinSpoke);

    const pivotDot = new Circle(6, {
      fill: RigidBodyPrecessionColors.accentColorProperty,
      stroke: RigidBodyPrecessionColors.textColorProperty,
      lineWidth: 1,
      center: pivot,
    });
    this.addChild(pivotDot);

    const tipDot = new Circle(5, { fill: RigidBodyPrecessionColors.tipTraceColorProperty });
    this.addChild(tipDot);

    const bandLabel = new Text("θ band", {
      font: LABEL_FONT,
      fill: RigidBodyPrecessionColors.nutationBandColorProperty,
      opacity: 0.9,
    });
    this.addChild(bandLabel);

    const update = (): void => {
      const theta = model.thetaProperty.value;
      const phi = model.phiProperty.value;
      const psi = model.psiProperty.value;
      const band = model.nutationBandProperty.value;

      const tip = projectAxisPoint(PROJECTION, theta, phi, AXLE_LENGTH_M);
      axle.setPoint1(pivot.x, pivot.y);
      axle.setPoint2(tip.x, tip.y);
      tipDot.center = tip;

      const rim = wheelRimPoints(PROJECTION, theta, phi, NUTATION_COM_DISTANCE_M, NUTATION_WHEEL_RADIUS_M);
      wheel.shape = Shape.polygon(rim);

      const [rimA, rimB] = wheelSilhouette(PROJECTION, theta, phi, NUTATION_COM_DISTANCE_M, NUTATION_WHEEL_RADIUS_M);
      hub.shape = Shape.polygon([pivot, rimA, rimB]);

      const spokeTip = projectRimPoint(PROJECTION, theta, phi, NUTATION_COM_DISTANCE_M, NUTATION_WHEEL_RADIUS_M, psi);
      const wheelCenter = projectAxisPoint(PROJECTION, theta, phi, NUTATION_COM_DISTANCE_M);
      spinSpoke.setPoint1(wheelCenter.x, wheelCenter.y);
      spinSpoke.setPoint2(spokeTip.x, spokeTip.y);

      bandMin.shape = bandShape(band.thetaMin);
      bandMax.shape = bandShape(band.thetaMax);
      const bandVisible = band.thetaMax - band.thetaMin > 1e-3;
      bandMin.visible = bandVisible;
      bandMax.visible = bandVisible;
      bandLabel.visible = bandVisible;
      if (bandVisible) {
        const outer = projectTiltCircle(PROJECTION, band.thetaMax, AXLE_LENGTH_M);
        bandLabel.right = outer.center.x - outer.radiusX - 4;
        bandLabel.centerY = outer.center.y;
      }

      const samples = model.getTraceSamples();
      const firstDrawn = Math.max(0, samples.length - NUTATION_TRACE_DRAW_SAMPLES);
      if (samples.length - firstDrawn > 1) {
        const traceShape = new Shape();
        for (let i = firstDrawn; i < samples.length; i++) {
          const sample = samples[i];
          if (!sample) {
            continue;
          }
          const point = projectAxisPoint(PROJECTION, sample.theta, sample.phi, AXLE_LENGTH_M);
          if (i === firstDrawn) {
            traceShape.moveToPoint(point);
          } else {
            traceShape.lineToPoint(point);
          }
        }
        tipTrace.shape = traceShape;
      } else {
        tipTrace.shape = new Shape();
      }
    };

    Multilink.multilink([model.thetaProperty, model.phiProperty, model.psiProperty], update);
    update();
  }
}
