/**
 * GyroStageNode.ts
 *
 * The fixed set the gyroscope performs on: a ground plane with a ring-and-radial
 * grid, the stand it pivots on, and the vertical the tilt is measured from.
 *
 * None of this is physics — it exists so the eye can locate the wheel in depth. A
 * gyroscope drawn against an empty background is genuinely ambiguous: the same
 * ellipse reads as tilting toward you or away from you. A gridded floor, a stand of
 * known height, and a shadow resolve it. Screens 1 and 2 share this so their two
 * apparatuses look like the same room.
 */

import { type Vector2, Vector3 } from "scenerystack/dot";
import { Shape } from "scenerystack/kite";
import { Node, Path } from "scenerystack/scenery";
import RigidBodyPrecessionColors from "../../RigidBodyPrecessionColors.js";
import { type Camera3D, circleArcPoints, project, projectHorizontalCircle, shadeColor } from "./Camera3D.js";
import { cylinderShapes } from "./CylinderShapes.js";

export type GyroStageOptions = {
  /** Height of the floor below the pivot (m, positive). */
  readonly standHeight: number;
  /** Radius of the drawn floor disc (m). */
  readonly groundRadius: number;
  /** Radius of the stand's post (m). */
  readonly postRadius?: number;
  /** How far above the pivot the vertical reference is drawn (m). */
  readonly verticalExtent: number;
};

const GROUND_RINGS = 3;
const GROUND_RADIALS = 12;

export class GyroStageNode extends Node {
  public constructor(camera: Camera3D, options: GyroStageOptions) {
    super();
    const groundZ = -options.standHeight;
    const postRadius = options.postRadius ?? 0.028;

    // ── Floor ─────────────────────────────────────────────────────────────────
    const floorCircle = projectHorizontalCircle(camera, groundZ, options.groundRadius);
    const floor = new Path(Shape.polygon(circleArcPoints(floorCircle, 0, 2 * Math.PI, 64)), {
      fill: RigidBodyPrecessionColors.sceneGroundColorProperty,
    });

    const grid = new Shape();
    for (let i = 1; i <= GROUND_RINGS; i++) {
      const ring = projectHorizontalCircle(camera, groundZ, (options.groundRadius * i) / GROUND_RINGS);
      const points = circleArcPoints(ring, 0, 2 * Math.PI, 48);
      grid.moveToPoint(points[0] as Vector2);
      for (let j = 1; j < points.length; j++) {
        grid.lineToPoint(points[j] as Vector2);
      }
    }
    for (let i = 0; i < GROUND_RADIALS; i++) {
      const angle = (i / GROUND_RADIALS) * 2 * Math.PI;
      const inner = project(camera, new Vector3(0, 0, groundZ));
      const outer = project(
        camera,
        new Vector3(options.groundRadius * Math.cos(angle), options.groundRadius * Math.sin(angle), groundZ),
      );
      grid.moveToPoint(inner);
      grid.lineToPoint(outer);
    }
    const gridPath = new Path(grid, {
      stroke: RigidBodyPrecessionColors.sceneGroundGridColorProperty,
      lineWidth: 0.75,
    });

    // ── Vertical reference through the pivot ──────────────────────────────────
    const vertical = new Path(
      new Shape()
        .moveToPoint(project(camera, new Vector3(0, 0, groundZ)))
        .lineToPoint(project(camera, new Vector3(0, 0, options.verticalExtent))),
      {
        stroke: RigidBodyPrecessionColors.textColorProperty,
        lineWidth: 1,
        lineDash: [4, 5],
        opacity: 0.4,
      },
    );

    // ── Stand ─────────────────────────────────────────────────────────────────
    const up = new Vector3(0, 0, 1);
    const ex = new Vector3(1, 0, 0);
    const ey = new Vector3(0, 1, 0);

    const baseColor = RigidBodyPrecessionColors.standColorProperty.value;
    const post = cylinderShapes(
      camera,
      up,
      ex,
      ey,
      new Vector3(0, 0, groundZ / 2),
      postRadius,
      options.standHeight / 2,
      32,
    );
    const postNode = new Node({
      children: [
        new Path(post.band, { fill: shadeColor(baseColor, 0.85), stroke: shadeColor(baseColor, 0.55), lineWidth: 1 }),
        new Path(post.cap, { fill: shadeColor(baseColor, 1.2) }),
      ],
    });

    const foot = cylinderShapes(
      camera,
      up,
      ex,
      ey,
      new Vector3(0, 0, groundZ + 0.018),
      options.groundRadius * 0.33,
      0.018,
      40,
    );
    const footNode = new Node({
      children: [
        new Path(foot.band, { fill: shadeColor(baseColor, 0.7), stroke: shadeColor(baseColor, 0.5), lineWidth: 1 }),
        new Path(foot.cap, { fill: shadeColor(baseColor, 1.05), stroke: shadeColor(baseColor, 0.6), lineWidth: 1 }),
      ],
    });

    this.children = [floor, gridPath, vertical, footNode, postNode];

    // The stand's shading is baked from the palette, so redraw it on theme change.
    RigidBodyPrecessionColors.standColorProperty.lazyLink((color) => {
      const shades = [0.85, 1.2, 0.7, 1.05];
      const nodes = [postNode.children[0], postNode.children[1], footNode.children[0], footNode.children[1]];
      nodes.forEach((node, i) => {
        (node as Path).fill = shadeColor(color, shades[i] as number);
      });
    });
  }
}
