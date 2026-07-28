/**
 * TumbleSceneNode.ts
 *
 * The tumbling block, with the two vectors that tell the story.
 *
 * **L never moves.** No torque acts, so the angular momentum is fixed in space, both
 * in size and in direction — it is drawn as a stationary arrow, and the fact that it
 * stays put while the block thrashes around it is the single most useful thing on the
 * screen. **ω does move**: it wanders around L, and during a flip it swings right
 * over. The two arrows are not parallel except when the block spins about a principal
 * axis, which is exactly why "the axis of rotation" is a slippery idea for an
 * asymmetric body.
 *
 * A short trail follows the tip of ω, so the polhode — the closed loop for a stable
 * axis, the long sweeping excursion for the unstable one — is visible as a shape
 * rather than having to be inferred from an arrow that keeps moving.
 */

import { Multilink } from "scenerystack/axon";
import { Bounds2, Vector2, Vector3 } from "scenerystack/dot";
import { Shape } from "scenerystack/kite";
import { Node, Path, Text } from "scenerystack/scenery";
import { ArrowNode, PhetFont } from "scenerystack/scenery-phet";
import { type Camera3D, createCamera, project } from "../../common/view/Camera3D.js";
import { type BoxGeometry, TumblingBoxNode } from "../../common/view/TumblingBoxNode.js";
import RigidBodyPrecessionColors from "../../RigidBodyPrecessionColors.js";
import { TUMBLE_BOX_SIZE_M, TUMBLE_SPIN_RANGE } from "../../RigidBodyPrecessionConstants.js";
import type { TorqueFreeModel } from "../model/TorqueFreeModel.js";

export const TUMBLE_SCENE_WIDTH = 400;
export const TUMBLE_SCENE_HEIGHT = 300;

const CAMERA: Camera3D = createCamera(new Vector2(TUMBLE_SCENE_WIDTH / 2, TUMBLE_SCENE_HEIGHT / 2 + 6), 300, 20);

const BOX_GEOMETRY: BoxGeometry = {
  size: new Vector3(TUMBLE_BOX_SIZE_M.x, TUMBLE_BOX_SIZE_M.y, TUMBLE_BOX_SIZE_M.z),
};

/** Metres of arrow drawn per rad/s, chosen so the fastest launch still fits. */
const OMEGA_SCALE_M = 0.42 / TUMBLE_SPIN_RANGE.max;

/** Samples kept in the ω-tip trail (about 3 s at 60 Hz). */
const TRAIL_SAMPLES = 190;

const LABEL_FONT = new PhetFont({ size: 13, weight: "bold" });
const ARROW = { headHeight: 11, headWidth: 10, tailWidth: 3 } as const;

export class TumbleSceneNode extends Node {
  private trail: Vector3[] = [];

  public constructor(model: TorqueFreeModel) {
    super();
    this.localBounds = new Bounds2(0, 0, TUMBLE_SCENE_WIDTH, TUMBLE_SCENE_HEIGHT);

    const origin = project(CAMERA, Vector3.ZERO);

    /** The plane ⊥ L through the center: a horizon to judge the block's tilt against. */
    const referencePlane = new Path(null, {
      stroke: RigidBodyPrecessionColors.angularMomentumColorProperty,
      lineWidth: 1,
      lineDash: [4, 5],
      opacity: 0.3,
    });

    const omegaTrail = new Path(null, {
      stroke: RigidBodyPrecessionColors.precessionColorProperty,
      lineWidth: 2,
      lineJoin: "round",
      opacity: 0.75,
    });

    const box = new TumblingBoxNode(CAMERA, BOX_GEOMETRY, this.palette());

    const momentumArrow = new ArrowNode(0, 0, 0, 0, {
      ...ARROW,
      fill: RigidBodyPrecessionColors.angularMomentumColorProperty,
      stroke: RigidBodyPrecessionColors.angularMomentumColorProperty,
    });
    const omegaArrow = new ArrowNode(0, 0, 0, 0, {
      ...ARROW,
      fill: RigidBodyPrecessionColors.precessionColorProperty,
      stroke: RigidBodyPrecessionColors.precessionColorProperty,
    });

    const momentumLabel = new Text("L", {
      font: LABEL_FONT,
      fill: RigidBodyPrecessionColors.angularMomentumColorProperty,
    });
    const omegaLabel = new Text("ω", {
      font: LABEL_FONT,
      fill: RigidBodyPrecessionColors.precessionColorProperty,
    });

    this.children = [referencePlane, omegaTrail, box, momentumArrow, omegaArrow, momentumLabel, omegaLabel];

    const update = (): void => {
      box.update(model.orientationProperty.value);

      const momentum = model.getWorldAngularMomentum();
      const omega = model.getWorldOmega();

      // L is drawn at a fixed length: its magnitude never changes, so a length that
      // wobbled would be a lie about the physics.
      const momentumLength = 0.42;
      const momentumDirection = momentum.magnitude > 1e-9 ? momentum.normalized() : new Vector3(0, 0, 1);
      const momentumTip = project(CAMERA, momentumDirection.timesScalar(momentumLength));
      momentumArrow.setTailAndTip(origin.x, origin.y, momentumTip.x, momentumTip.y);
      momentumLabel.centerX = momentumTip.x + 12;
      momentumLabel.centerY = momentumTip.y - 8;

      const omegaWorld = omega.timesScalar(OMEGA_SCALE_M);
      const omegaTip = project(CAMERA, omegaWorld);
      omegaArrow.setTailAndTip(origin.x, origin.y, omegaTip.x, omegaTip.y);
      omegaLabel.centerX = omegaTip.x - 12;
      omegaLabel.centerY = omegaTip.y + 10;

      // Trail of the ω tip — the polhode, traced in space.
      this.trail.push(omegaWorld);
      if (this.trail.length > TRAIL_SAMPLES) {
        this.trail.shift();
      }
      if (this.trail.length > 1) {
        const shape = new Shape();
        this.trail.forEach((point, index) => {
          const projected = project(CAMERA, point);
          if (index === 0) {
            shape.moveToPoint(projected);
          } else {
            shape.lineToPoint(projected);
          }
        });
        omegaTrail.shape = shape;
      } else {
        omegaTrail.shape = null;
      }

      // Disc of radius `momentumLength` in the plane ⊥ L, drawn as a polygon through
      // an orthonormal pair spanning that plane.
      const helper = Math.abs(momentumDirection.z) < 0.9 ? new Vector3(0, 0, 1) : new Vector3(1, 0, 0);
      const u = momentumDirection.cross(helper).normalized();
      const v = momentumDirection.cross(u).normalized();
      const ring = new Shape();
      const samples = 48;
      for (let i = 0; i <= samples; i++) {
        const angle = (i / samples) * 2 * Math.PI;
        const point = project(
          CAMERA,
          u
            .timesScalar(momentumLength * 0.82 * Math.cos(angle))
            .plus(v.timesScalar(momentumLength * 0.82 * Math.sin(angle))),
        );
        if (i === 0) {
          ring.moveToPoint(point);
        } else {
          ring.lineToPoint(point);
        }
      }
      referencePlane.shape = ring;
    };

    // A relaunch clears the trail; the clock going back to zero is the signal.
    model.timer.timeProperty.link((time) => {
      if (time === 0) {
        this.trail = [];
      }
    });

    Multilink.multilink([model.orientationProperty, model.omegaProperty], update);

    Multilink.multilink(
      [
        RigidBodyPrecessionColors.wheelBodyColorProperty,
        RigidBodyPrecessionColors.torqueColorProperty,
        RigidBodyPrecessionColors.weightColorProperty,
        RigidBodyPrecessionColors.gyroscopeColorProperty,
      ],
      () => {
        box.setPalette(this.palette());
        update();
      },
    );

    update();
  }

  private palette() {
    return {
      faceX: RigidBodyPrecessionColors.wheelBodyColorProperty.value,
      faceY: RigidBodyPrecessionColors.torqueColorProperty.value,
      faceZ: RigidBodyPrecessionColors.weightColorProperty.value,
      edge: RigidBodyPrecessionColors.gyroscopeColorProperty.value,
    };
  }
}
