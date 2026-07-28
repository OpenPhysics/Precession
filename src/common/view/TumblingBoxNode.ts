/**
 * TumblingBoxNode.ts
 *
 * A shaded rectangular block drawn from its orientation quaternion.
 *
 * A convex solid needs no depth sorting: a face is visible exactly when its outward
 * normal points toward the camera, and no visible face can hide another. So the whole
 * renderer is "cull the three back faces, shade the three front ones" — cheap, exact,
 * and enough to make the block unmistakably solid as it tumbles.
 *
 * Each face carries a different tint and one carries a marking, because a plain grey
 * box mid-flip is ambiguous about *which* way it flipped. The point of the screen is
 * that the block turns over; the viewer has to be able to see that it has.
 */

import { Vector2, Vector3 } from "scenerystack/dot";
import { Shape } from "scenerystack/kite";
import { type Color, Node, Path } from "scenerystack/scenery";
import type { Rotation } from "../rigid-body/TorqueFreePhysics.js";
import { rotateToWorld } from "../rigid-body/TorqueFreePhysics.js";
import { type Camera3D, project, shadeColor, shadeFactor, viewDirection } from "./Camera3D.js";

export type BoxGeometry = {
  /** Full side lengths along the body's x, y, z axes (m). */
  readonly size: Vector3;
};

export type BoxPalette = {
  /** Base color of the faces perpendicular to the body x axis. */
  readonly faceX: Color;
  /** Base color of the faces perpendicular to the body y axis. */
  readonly faceY: Color;
  /** Base color of the faces perpendicular to the body z axis. */
  readonly faceZ: Color;
  /** Edge color. */
  readonly edge: Color;
};

/**
 * The six faces, each as an outward normal plus the four corners in counterclockwise
 * order seen from outside. Signs are in units of the half-extents.
 */
const FACES: ReadonlyArray<{ normal: Vector3; corners: ReadonlyArray<Vector3>; axis: 0 | 1 | 2 }> = [
  {
    axis: 0,
    normal: new Vector3(1, 0, 0),
    corners: [new Vector3(1, -1, -1), new Vector3(1, 1, -1), new Vector3(1, 1, 1), new Vector3(1, -1, 1)],
  },
  {
    axis: 0,
    normal: new Vector3(-1, 0, 0),
    corners: [new Vector3(-1, 1, -1), new Vector3(-1, -1, -1), new Vector3(-1, -1, 1), new Vector3(-1, 1, 1)],
  },
  {
    axis: 1,
    normal: new Vector3(0, 1, 0),
    corners: [new Vector3(1, 1, -1), new Vector3(-1, 1, -1), new Vector3(-1, 1, 1), new Vector3(1, 1, 1)],
  },
  {
    axis: 1,
    normal: new Vector3(0, -1, 0),
    corners: [new Vector3(-1, -1, -1), new Vector3(1, -1, -1), new Vector3(1, -1, 1), new Vector3(-1, -1, 1)],
  },
  {
    axis: 2,
    normal: new Vector3(0, 0, 1),
    corners: [new Vector3(-1, -1, 1), new Vector3(1, -1, 1), new Vector3(1, 1, 1), new Vector3(-1, 1, 1)],
  },
  {
    axis: 2,
    normal: new Vector3(0, 0, -1),
    corners: [new Vector3(1, -1, -1), new Vector3(-1, -1, -1), new Vector3(-1, 1, -1), new Vector3(1, 1, -1)],
  },
];

/**
 * The +x face — the block's largest — carries a painted mark, so a half turn is
 * something you see happen rather than something you infer afterwards.
 */
const MARKED_FACE_INDEX = 0;

export class TumblingBoxNode extends Node {
  private readonly facePaths: Path[] = [];
  private readonly markPath = new Path(null);
  private readonly camera: Camera3D;
  private readonly geometry: BoxGeometry;
  private palette: BoxPalette;

  public constructor(camera: Camera3D, geometry: BoxGeometry, palette: BoxPalette) {
    super();
    this.camera = camera;
    this.geometry = geometry;
    this.palette = palette;

    for (const _face of FACES) {
      const path = new Path(null, { lineWidth: 1.2, lineJoin: "round" });
      this.facePaths.push(path);
      this.addChild(path);
    }
    this.addChild(this.markPath);
  }

  public setPalette(palette: BoxPalette): void {
    this.palette = palette;
  }

  public update(orientation: Rotation, center: Vector3 = Vector3.ZERO): void {
    const camera = this.camera;
    const geometry = this.geometry;
    const palette = this.palette;
    const half = geometry.size.timesScalar(0.5);
    const toCamera = viewDirection(camera);
    const baseColors = [palette.faceX, palette.faceY, palette.faceZ];

    let markShown = false;

    for (let i = 0; i < FACES.length; i++) {
      const face = FACES[i] as (typeof FACES)[number];
      const path = this.facePaths[i] as Path;

      const worldNormal = rotateToWorld(orientation, face.normal);
      // Back-face culling. For a convex body this alone is a complete hidden-surface
      // solution — the three surviving faces never overlap each other.
      if (worldNormal.dot(toCamera) <= 0) {
        path.visible = false;
        continue;
      }

      const points = face.corners.map((corner) => {
        const body = new Vector3(corner.x * half.x, corner.y * half.y, corner.z * half.z);
        return project(camera, center.plus(rotateToWorld(orientation, body)));
      });

      const base = baseColors[face.axis] as Color;
      path.shape = Shape.polygon(points);
      path.fill = shadeColor(base, shadeFactor(worldNormal, 0.5));
      path.stroke = shadeColor(palette.edge, 0.9);
      path.visible = true;

      if (i === MARKED_FACE_INDEX) {
        // Inset diamond on the marked face, drawn from the same projected corners so
        // it deforms with the perspective exactly as a painted mark would.
        const centerPoint = points.reduce((sum, point) => sum.plus(point), Vector2.ZERO).timesScalar(1 / points.length);
        const diamond = points.map((point) => centerPoint.blend(point, 0.55));
        this.markPath.shape = Shape.polygon(diamond);
        this.markPath.fill = shadeColor(palette.edge, 1.4);
        this.markPath.opacity = 0.85;
        markShown = true;
      }
    }

    this.markPath.visible = markShown;
  }
}
