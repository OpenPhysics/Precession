/**
 * RigidBodyPrecessionScreenIcons.ts
 *
 * Programmatic home-screen / navigation-bar icons for each screen.
 */

import { Circle, Line, Node, Rectangle } from "scenerystack/scenery";
import { ScreenIcon } from "scenerystack/sim";
import RigidBodyPrecessionColors from "../RigidBodyPrecessionColors.js";

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

export function createSteadyPrecessionIcon(): ScreenIcon {
  const pivotX = 200;
  const pivotY = 220;
  const axle = new Line(pivotX, pivotY, 360, 140, {
    stroke: RigidBodyPrecessionColors.gyroscopeColorProperty,
    lineWidth: 8,
    lineCap: "round",
  });
  const disk = new Circle(36, {
    fill: RigidBodyPrecessionColors.angularMomentumColorProperty,
    centerX: 290,
    centerY: 175,
  });
  const torque = new Line(pivotX, pivotY, pivotX + 90, pivotY, {
    stroke: RigidBodyPrecessionColors.torqueColorProperty,
    lineWidth: 6,
    lineCap: "round",
  });
  return iconFrom(new Node({ children: [background(), axle, disk, torque] }));
}

export function createNutationIcon(): ScreenIcon {
  const loop = new Circle(70, {
    fill: "transparent",
    stroke: RigidBodyPrecessionColors.precessionColorProperty,
    lineWidth: 5,
    centerX: 280,
    centerY: 170,
  });
  const wobble = new Circle(18, {
    fill: RigidBodyPrecessionColors.torqueColorProperty,
    centerX: 330,
    centerY: 150,
  });
  return iconFrom(new Node({ children: [background(), loop, wobble] }));
}

export function createTorqueFreeIcon(): ScreenIcon {
  const book = new Rectangle(220, 120, 120, 160, {
    fill: RigidBodyPrecessionColors.accentColorProperty,
    cornerRadius: 8,
    rotation: 0.6,
    centerX: 280,
    centerY: 190,
  });
  const axis = new Line(180, 260, 380, 110, {
    stroke: RigidBodyPrecessionColors.precessionColorProperty,
    lineWidth: 4,
    lineDash: [10, 8],
  });
  return iconFrom(new Node({ children: [background(), axis, book] }));
}
