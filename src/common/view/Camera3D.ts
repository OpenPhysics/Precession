/**
 * Camera3D.ts
 *
 * The single 3-D → 2-D map used by every scene in the sim, plus the depth and
 * shading queries that make the drawings readable as solid objects.
 *
 * World coordinates are right-handed with +z up. The camera sits in the −y
 * half-space, raised by `elevation` above the horizontal plane, and looks at the
 * world origin. Its orthonormal frame is
 *
 *   right   r = ( 1,      0,       0      )
 *   up      u = ( 0,  sin e,   cos e      )
 *   forward f = ( 0,  cos e,  −sin e      )
 *
 * so a world point p maps to screen (x right, y **down**) and a depth that grows
 * with distance from the camera:
 *
 *   screen = origin + s · ( p·r , −p·u )
 *   depth  = p·f
 *
 * Because the map is linear, a circle projects to an exact ellipse spanned by the
 * projections of its two in-plane basis vectors — no approximation is needed to
 * draw a wheel at any tilt. `depth` is what lets the scenes order their pieces
 * back-to-front instead of guessing.
 */

import { Vector2, Vector3 } from "scenerystack/dot";
import { Color } from "scenerystack/scenery";

export type Camera3D = {
  /** Screen position of the world origin, in view pixels. */
  readonly origin: Vector2;
  /** Scale from meters to view pixels. */
  readonly pxPerM: number;
  /** Camera elevation above the horizontal plane (rad), 0 = side on, π/2 = overhead. */
  readonly elevation: number;
};

export function createCamera(origin: Vector2, pxPerM: number, elevationDegrees: number): Camera3D {
  return { origin, pxPerM, elevation: (elevationDegrees * Math.PI) / 180 };
}

/** Project a world point (m) to screen pixels. */
export function project(camera: Camera3D, p: Vector3): Vector2 {
  const sinE = Math.sin(camera.elevation);
  const cosE = Math.cos(camera.elevation);
  const s = camera.pxPerM;
  return new Vector2(camera.origin.x + s * p.x, camera.origin.y - s * (p.y * sinE + p.z * cosE));
}

/** Project a world direction — the same linear map without the origin translation. */
export function projectDirection(camera: Camera3D, d: Vector3): Vector2 {
  const sinE = Math.sin(camera.elevation);
  const cosE = Math.cos(camera.elevation);
  const s = camera.pxPerM;
  return new Vector2(s * d.x, -s * (d.y * sinE + d.z * cosE));
}

/**
 * Depth of a world point along the view direction: larger is farther from the
 * camera. Scenes compare depths to decide what occludes what.
 */
export function depth(camera: Camera3D, p: Vector3): number {
  return p.y * Math.cos(camera.elevation) - p.z * Math.sin(camera.elevation);
}

/** Unit vector from the scene toward the camera, in world coordinates. */
export function viewDirection(camera: Camera3D): Vector3 {
  return new Vector3(0, -Math.cos(camera.elevation), Math.sin(camera.elevation));
}

// ── Circles in an arbitrary plane ─────────────────────────────────────────────

export type ProjectedCircle = {
  /** Screen position of the circle's center. */
  readonly center: Vector2;
  /** Screen vector spanned by the first in-plane basis direction, scaled by the radius. */
  readonly a: Vector2;
  /** Screen vector spanned by the second in-plane basis direction, scaled by the radius. */
  readonly b: Vector2;
};

/**
 * Exact projection of a circle of `radius` centered at `center`, lying in the plane
 * spanned by the orthonormal pair (e1, e2).
 */
export function projectCircle(
  camera: Camera3D,
  center: Vector3,
  e1: Vector3,
  e2: Vector3,
  radius: number,
): ProjectedCircle {
  return {
    center: project(camera, center),
    a: projectDirection(camera, e1).timesScalar(radius),
    b: projectDirection(camera, e2).timesScalar(radius),
  };
}

/** Screen point on a projected circle at in-plane angle α. */
export function circlePoint(circle: ProjectedCircle, alpha: number): Vector2 {
  const cos = Math.cos(alpha);
  const sin = Math.sin(alpha);
  return new Vector2(
    circle.center.x + circle.a.x * cos + circle.b.x * sin,
    circle.center.y + circle.a.y * cos + circle.b.y * sin,
  );
}

/** Polyline samples of a projected circle over the arc [alphaStart, alphaStart + sweep]. */
export function circleArcPoints(
  circle: ProjectedCircle,
  alphaStart: number,
  sweep: number,
  pointCount: number,
): Vector2[] {
  const points: Vector2[] = [];
  for (let i = 0; i <= pointCount; i++) {
    points.push(circlePoint(circle, alphaStart + (sweep * i) / pointCount));
  }
  return points;
}

/**
 * Horizontal circle of the given radius at height z — the workhorse for ground
 * rings, precession orbits, and latitude lines.
 */
export function projectHorizontalCircle(camera: Camera3D, z: number, radius: number): ProjectedCircle {
  return projectCircle(camera, new Vector3(0, 0, z), new Vector3(1, 0, 0), new Vector3(0, 1, 0), radius);
}

// ── Orientation helpers ───────────────────────────────────────────────────────

/**
 * Symmetry axis n̂ of a top at nutation angle θ (from +z) and precession angle φ.
 */
export function symmetryAxis(theta: number, phi: number): Vector3 {
  const sinTheta = Math.sin(theta);
  return new Vector3(sinTheta * Math.cos(phi), sinTheta * Math.sin(phi), Math.cos(theta));
}

/**
 * Orthonormal basis of the plane ⊥ n̂. e1 is the horizontal line of nodes, so a
 * body's spin angle ψ is measured from it; e2 completes the right-handed frame.
 */
export function axisFrame(theta: number, phi: number): { e1: Vector3; e2: Vector3 } {
  const sinPhi = Math.sin(phi);
  const cosPhi = Math.cos(phi);
  return {
    e1: new Vector3(-sinPhi, cosPhi, 0),
    e2: new Vector3(-Math.cos(theta) * cosPhi, -Math.cos(theta) * sinPhi, Math.sin(theta)),
  };
}

// ── Shading ───────────────────────────────────────────────────────────────────

/**
 * Key light direction — the direction light travels *toward*. Up-and-left-and-front,
 * the convention that makes a shaded solid read correctly to most viewers.
 */
export const LIGHT = new Vector3(-0.45, -0.55, -0.7).normalized();

/** Unit vector pointing back toward the key light — the brightest surface normal. */
export const TOWARD_LIGHT = LIGHT.negated();

/**
 * Lambert shade factor in [0, 1] for a surface with the given outward normal,
 * lifted by an ambient term so that faces turned away are dim rather than black.
 */
export function shadeFactor(normal: Vector3, ambient = 0.42): number {
  const lambert = Math.max(0, -normal.dot(LIGHT));
  return ambient + (1 - ambient) * lambert;
}

/** Multiply a color's RGB by `factor`, preserving alpha. */
export function shadeColor(base: Color, factor: number): Color {
  return new Color(
    Math.round(Math.min(255, base.red * factor)),
    Math.round(Math.min(255, base.green * factor)),
    Math.round(Math.min(255, base.blue * factor)),
    base.alpha,
  );
}

/** Blend two colors, `t` = 0 gives `from`, `t` = 1 gives `to`. */
export function blendColor(from: Color, to: Color, t: number): Color {
  const u = Math.max(0, Math.min(1, t));
  return new Color(
    Math.round(from.red + (to.red - from.red) * u),
    Math.round(from.green + (to.green - from.green) * u),
    Math.round(from.blue + (to.blue - from.blue) * u),
    from.alpha + (to.alpha - from.alpha) * u,
  );
}
