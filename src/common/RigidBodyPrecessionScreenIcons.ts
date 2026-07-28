/**
 * RigidBodyPrecessionScreenIcons.ts
 *
 * Programmatic home-screen / navigation-bar icons.
 *
 * Each icon is built from the same `Camera3D` and the same renderers the screens use,
 * so it is a small portrait of what the screen actually looks like rather than a
 * separate piece of clip art that has to be kept in sync by hand.
 */

import { Vector2, Vector3 } from "scenerystack/dot";
import { Shape } from "scenerystack/kite";
import { Node, Path, Rectangle } from "scenerystack/scenery";
import { ArrowNode } from "scenerystack/scenery-phet";
import { ScreenIcon } from "scenerystack/sim";
import RigidBodyPrecessionColors from "../RigidBodyPrecessionColors.js";
import { TUMBLE_BOX_SIZE_M } from "../RigidBodyPrecessionConstants.js";
import type { Rotation } from "./rigid-body/TorqueFreePhysics.js";
import { type Camera3D, circleArcPoints, createCamera, project, projectHorizontalCircle } from "./view/Camera3D.js";
import { SpinningWheelNode, type WheelGeometry } from "./view/SpinningWheelNode.js";
import { TumblingBoxNode } from "./view/TumblingBoxNode.js";

const W = 548;
const H = 373;

function background(): Rectangle {
  return new Rectangle(0, 0, W, H, { fill: RigidBodyPrecessionColors.backgroundColorProperty });
}

function iconFrom(content: Node): ScreenIcon {
  return new ScreenIcon(content, {
    maxIconWidthProportion: 1,
    maxIconHeightProportion: 1,
    fill: RigidBodyPrecessionColors.backgroundColorProperty,
  });
}

function wheelPalette() {
  return {
    body: RigidBodyPrecessionColors.wheelBodyColorProperty.value,
    marking: RigidBodyPrecessionColors.wheelMarkingColorProperty.value,
    axle: RigidBodyPrecessionColors.gyroscopeColorProperty.value,
    shadow: RigidBodyPrecessionColors.sceneShadowColorProperty.value,
  };
}

/** Polyline through a list of world points, as one Shape. */
function polyline(camera: Camera3D, points: Vector3[]): Shape {
  const shape = new Shape();
  points.forEach((point, index) => {
    const projected = project(camera, point);
    if (index === 0) {
      shape.moveToPoint(projected);
    } else {
      shape.lineToPoint(projected);
    }
  });
  return shape;
}

export function createSteadyPrecessionIcon(): ScreenIcon {
  const camera = createCamera(new Vector2(W / 2 - 30, H / 2 + 40), 330, 24);
  const geometry: WheelGeometry = {
    radius: 0.25,
    halfThickness: 0.03,
    hubRadius: 0.04,
    comDistance: 0.3,
    axleLength: 0.62,
    axleRadius: 0.02,
  };

  const tilt = Math.PI / 4;
  const phi = -0.5;

  const orbit = new Path(
    Shape.polygon(
      circleArcPoints(
        projectHorizontalCircle(camera, geometry.axleLength * Math.cos(tilt), geometry.axleLength * Math.sin(tilt)),
        0,
        2 * Math.PI,
        48,
      ),
    ),
    {
      stroke: RigidBodyPrecessionColors.precessionColorProperty,
      lineWidth: 5,
      lineDash: [14, 11],
      opacity: 0.75,
    },
  );

  const wheel = new SpinningWheelNode(camera, geometry, wheelPalette());
  wheel.update({ theta: tilt, phi, psiDisplay: 0.5, spinBlur: 0.35 });

  const torque = new ArrowNode(0, 0, 0, 0, {
    headHeight: 22,
    headWidth: 20,
    tailWidth: 7,
    fill: RigidBodyPrecessionColors.torqueColorProperty,
    stroke: RigidBodyPrecessionColors.torqueColorProperty,
  });
  const tipDirection = new Vector3(Math.sin(tilt) * Math.cos(phi), Math.sin(tilt) * Math.sin(phi), Math.cos(tilt));
  const tip = project(camera, tipDirection.timesScalar(geometry.axleLength));
  const tangent = project(camera, new Vector3(-Math.sin(phi), Math.cos(phi), 0)).minus(project(camera, Vector3.ZERO));
  const tauTip = tip.plus(tangent.normalized().timesScalar(85));
  torque.setTailAndTip(tip.x, tip.y, tauTip.x, tauTip.y);

  return iconFrom(new Node({ children: [background(), orbit, wheel, torque] }));
}

export function createNutationIcon(): ScreenIcon {
  const camera = createCamera(new Vector2(W / 2, H / 2 + 70), 250, 22);
  const geometry: WheelGeometry = {
    radius: 0.26,
    halfThickness: 0.035,
    hubRadius: 0.04,
    comDistance: 0.13,
    axleLength: 0.86,
    axleRadius: 0.022,
  };

  // The cusped tip path in the fast-top limit: θ dips and returns while φ advances in
  // scallops — the same curve the screen integrates, written out in closed form.
  const thetaMin = Math.PI / 4;
  const amplitude = 0.3;
  const points: Vector3[] = [];
  for (let i = 0; i <= 220; i++) {
    const s = (i / 220) * 6 * Math.PI;
    const theta = thetaMin + (amplitude * (1 - Math.cos(s))) / 2;
    const phi = 0.34 * (s - Math.sin(s)) - 2.4;
    points.push(
      new Vector3(
        Math.sin(theta) * Math.cos(phi) * geometry.axleLength,
        Math.sin(theta) * Math.sin(phi) * geometry.axleLength,
        Math.cos(theta) * geometry.axleLength,
      ),
    );
  }

  const trace = new Path(polyline(camera, points), {
    stroke: RigidBodyPrecessionColors.tipTraceColorProperty,
    lineWidth: 6,
    lineJoin: "round",
  });

  const wheel = new SpinningWheelNode(camera, geometry, wheelPalette());
  wheel.update({ theta: thetaMin + amplitude / 2, phi: -0.9, psiDisplay: 0.9, spinBlur: 0.2 });

  return iconFrom(new Node({ children: [background(), trace, wheel] }));
}

export function createTorqueFreeIcon(): ScreenIcon {
  const camera = createCamera(new Vector2(W / 2, H / 2), 800, 20);

  // Caught mid-flip: a quarter turn about the body's long axis combined with a tip,
  // which is the pose that reads least like a box just sitting there.
  const angle = 0.62;
  const axis = new Vector3(0.42, 0.28, 0.86).normalized();
  const orientation: Rotation = {
    x: axis.x * Math.sin(angle / 2),
    y: axis.y * Math.sin(angle / 2),
    z: axis.z * Math.sin(angle / 2),
    w: Math.cos(angle / 2),
  };
  const box = new TumblingBoxNode(
    camera,
    { size: new Vector3(TUMBLE_BOX_SIZE_M.x, TUMBLE_BOX_SIZE_M.y, TUMBLE_BOX_SIZE_M.z) },
    {
      faceX: RigidBodyPrecessionColors.wheelBodyColorProperty.value,
      faceY: RigidBodyPrecessionColors.torqueColorProperty.value,
      faceZ: RigidBodyPrecessionColors.weightColorProperty.value,
      edge: RigidBodyPrecessionColors.gyroscopeColorProperty.value,
      mark: RigidBodyPrecessionColors.wheelMarkingColorProperty.value,
    },
  );
  box.update(orientation);

  const momentum = new ArrowNode(0, 0, 0, 0, {
    headHeight: 24,
    headWidth: 22,
    tailWidth: 8,
    fill: RigidBodyPrecessionColors.angularMomentumColorProperty,
    stroke: RigidBodyPrecessionColors.angularMomentumColorProperty,
  });
  const origin = project(camera, Vector3.ZERO);
  const tip = project(camera, new Vector3(0, 0, 0.26));
  momentum.setTailAndTip(origin.x, origin.y, tip.x, tip.y);

  return iconFrom(new Node({ children: [background(), box, momentum] }));
}
