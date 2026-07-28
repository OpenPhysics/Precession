/**
 * TopSceneNode.ts
 *
 * The heavy symmetric top in three dimensions: a pivoted wheel, the band of tilts its
 * axis is trapped in, and the path the axle tip carves on the sphere.
 *
 * The trace is the whole point of the screen — cusps, loops and smooth waves are the
 * same equations released three different ways — so the scene is built around keeping
 * it readable while a solid wheel swings through the middle of it:
 *
 *  - the trace is split by depth, and the wheel is drawn between the two halves, so
 *    the path genuinely passes behind the wheel and back out in front of it;
 *  - the far half is dimmed, which is enough on its own to tell a loop that goes
 *    away from you from one that comes toward you;
 *  - the two turning-point circles are drawn on the sphere, marking the band of tilts
 *    the axis can never leave.
 *
 * The companion `TipPathViewNode` shows the same path flattened from above, which is
 * where the *shape* of each release mode is easiest to name.
 */

import { Multilink } from "scenerystack/axon";
import { Bounds2, Vector2, Vector3 } from "scenerystack/dot";
import { Shape } from "scenerystack/kite";
import { Circle, Node, Path } from "scenerystack/scenery";
import {
  type Camera3D,
  circleArcPoints,
  createCamera,
  depth,
  project,
  projectHorizontalCircle,
  symmetryAxis,
} from "../../common/view/Camera3D.js";
import { GyroStageNode } from "../../common/view/GyroStageNode.js";
import { SpinningWheelNode, type WheelGeometry } from "../../common/view/SpinningWheelNode.js";
import { SpinPhaseTracker, spinBlurFor } from "../../common/view/SpinPhase.js";
import RigidBodyPrecessionColors from "../../RigidBodyPrecessionColors.js";
import {
  NUTATION_COM_DISTANCE_M,
  NUTATION_TRACE_DRAW_SAMPLES,
  NUTATION_WHEEL_RADIUS_M,
} from "../../RigidBodyPrecessionConstants.js";
import type { NutationModel } from "../model/NutationModel.js";
import { TIP_RADIUS_M } from "./TipPathViewNode.js";

export const TOP_SCENE_WIDTH = 390;
export const TOP_SCENE_HEIGHT = 300;

const CAMERA: Camera3D = createCamera(new Vector2(195, 154), 188, 22);

/**
 * The pivot sits on a tall pillar so the wheel — which is wide and mounted close to
 * the pivot — swings clear of the floor even with the axle near horizontal.
 */
const STAND_HEIGHT_M = 0.62;
const GROUND_RADIUS_M = 0.5;

/**
 * Drawn length of the axle beyond the wheel (m). Visual only: the dynamics depend on
 * the inertias and the center-of-mass distance, not on where the axle ends. Shared
 * with the top-down view so both draw the tip on the same sphere.
 */
const AXLE_LENGTH_M = TIP_RADIUS_M;

const WHEEL_GEOMETRY: WheelGeometry = {
  radius: NUTATION_WHEEL_RADIUS_M,
  halfThickness: 0.035,
  hubRadius: 0.045,
  comDistance: NUTATION_COM_DISTANCE_M,
  axleLength: AXLE_LENGTH_M,
  axleRadius: 0.018,
};

/** Polyline of the horizontal circle the tip would trace at a fixed tilt. */
function tiltCircleShape(theta: number): Shape {
  const circle = projectHorizontalCircle(
    CAMERA,
    AXLE_LENGTH_M * Math.cos(theta),
    Math.max(0.001, AXLE_LENGTH_M * Math.sin(theta)),
  );
  return Shape.polygon(circleArcPoints(circle, 0, 2 * Math.PI, 64));
}

export class TopSceneNode extends Node {
  private readonly spinPhase = new SpinPhaseTracker();

  public constructor(model: NutationModel) {
    super();
    this.localBounds = new Bounds2(0, 0, TOP_SCENE_WIDTH, TOP_SCENE_HEIGHT);

    const stage = new GyroStageNode(CAMERA, {
      standHeight: STAND_HEIGHT_M,
      groundRadius: GROUND_RADIUS_M,
      postRadius: 0.022,
      verticalExtent: AXLE_LENGTH_M + 0.04,
    });

    // Two separate paths rather than one filled zone: on the sphere the two turning
    // circles are not concentric in projection, so there is no honest region to fill
    // between them. The top-down panel, where they are concentric, fills it instead.
    const bandOptions = {
      stroke: RigidBodyPrecessionColors.nutationBandColorProperty,
      lineWidth: 1.4,
      lineDash: [6, 5],
      opacity: 0.85,
    };
    const bandMin = new Path(null, bandOptions);
    const bandMax = new Path(null, bandOptions);

    const traceFar = new Path(null, {
      stroke: RigidBodyPrecessionColors.tipTraceColorProperty,
      lineWidth: 1.6,
      lineJoin: "round",
      opacity: 0.4,
    });
    const traceNear = new Path(null, {
      stroke: RigidBodyPrecessionColors.tipTraceColorProperty,
      lineWidth: 2.4,
      lineJoin: "round",
      opacity: 0.95,
    });

    const wheel = new SpinningWheelNode(CAMERA, WHEEL_GEOMETRY, this.palette(), { groundZ: -STAND_HEIGHT_M });

    const pivotDot = new Circle(5, {
      fill: RigidBodyPrecessionColors.accentColorProperty,
      stroke: RigidBodyPrecessionColors.textColorProperty,
      lineWidth: 1,
      center: project(CAMERA, Vector3.ZERO),
    });
    const tipDot = new Circle(5, {
      fill: RigidBodyPrecessionColors.tipTraceColorProperty,
      stroke: RigidBodyPrecessionColors.backgroundColorProperty,
      lineWidth: 1,
    });

    this.children = [stage, bandMin, bandMax, traceFar, wheel, traceNear, pivotDot, tipDot];

    const update = (): void => {
      const theta = model.thetaProperty.value;
      const phi = model.phiProperty.value;
      const band = model.nutationBandProperty.value;

      wheel.update({
        theta,
        phi,
        psiDisplay: this.spinPhase.phaseAt(model.timer.timeProperty.value, model.spinProperty.value),
        spinBlur: spinBlurFor(model.spinProperty.value),
      });

      tipDot.center = project(CAMERA, symmetryAxis(theta, phi).timesScalar(AXLE_LENGTH_M));

      // ── Turning-point band ──────────────────────────────────────────────────
      const bandVisible = band.thetaMax - band.thetaMin > 1e-3;
      if (bandVisible) {
        bandMin.shape = tiltCircleShape(band.thetaMin);
        bandMax.shape = tiltCircleShape(band.thetaMax);
      }
      bandMin.visible = bandVisible;
      bandMax.visible = bandVisible;

      // ── Tip trace, split at the wheel ───────────────────────────────────────
      // A single path would either sit entirely on top of the wheel or entirely
      // behind it; splitting by depth is what makes the loops read as loops.
      const samples = model.getTraceSamples();
      const first = Math.max(0, samples.length - NUTATION_TRACE_DRAW_SAMPLES);
      const far = new Shape();
      const near = new Shape();
      let previousWasFar: boolean | null = null;
      let previousPoint: Vector2 | null = null;

      for (let i = first; i < samples.length; i++) {
        const sample = samples[i];
        if (!sample) {
          continue;
        }
        const world = symmetryAxis(sample.theta, sample.phi).timesScalar(AXLE_LENGTH_M);
        const point = project(CAMERA, world);
        const isFar = depth(CAMERA, world) > 0;
        const target = isFar ? far : near;

        if (previousWasFar !== isFar || previousPoint === null) {
          // Start the new half at the previous point so the two halves join up.
          target.moveToPoint(previousPoint ?? point);
        }
        target.lineToPoint(point);
        previousWasFar = isFar;
        previousPoint = point;
      }

      traceFar.shape = far;
      traceNear.shape = near;
    };

    Multilink.multilink([model.thetaProperty, model.phiProperty], update);

    // The wheel's shading is baked from palette values, so redraw on theme change.
    Multilink.multilink(
      [
        RigidBodyPrecessionColors.wheelBodyColorProperty,
        RigidBodyPrecessionColors.wheelMarkingColorProperty,
        RigidBodyPrecessionColors.gyroscopeColorProperty,
        RigidBodyPrecessionColors.sceneShadowColorProperty,
      ],
      () => {
        wheel.setPalette(this.palette());
        update();
      },
    );

    update();
  }

  private palette() {
    return {
      body: RigidBodyPrecessionColors.wheelBodyColorProperty.value,
      marking: RigidBodyPrecessionColors.wheelMarkingColorProperty.value,
      axle: RigidBodyPrecessionColors.gyroscopeColorProperty.value,
      shadow: RigidBodyPrecessionColors.sceneShadowColorProperty.value,
    };
  }
}
