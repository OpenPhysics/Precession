/**
 * TopProjection.ts
 *
 * Projection helpers for drawing a heavy symmetric top from its Euler angles.
 *
 * World coordinates are right-handed with +z up and the pivot at the origin. The
 * view is a linear oblique projection, matching the schematic used on Screen 1:
 *
 *   view.x = pivot.x + s·v_x
 *   view.y = pivot.y − s·v_z + s·k·v_y
 *
 * where s is the pixels-per-meter scale and k the depth foreshortening. Because
 * the map is linear, the projection of the wheel's rim circle is exactly an
 * ellipse spanned by the projections of the two in-plane basis vectors — no
 * approximation is needed to draw the wheel at any tilt.
 */

import { Vector2, Vector3 } from "scenerystack/dot";

export type TopProjection = {
  /** Pivot location in view pixels. */
  readonly pivot: Vector2;
  /** Scale from meters to view pixels. */
  readonly pxPerM: number;
  /** Foreshortening applied to the depth (y) axis, 0–1. */
  readonly perspective: number;
};

/**
 * Symmetry axis n̂ for a top at nutation angle θ and precession angle φ.
 * θ is measured from the upward vertical, φ is the azimuth about it.
 */
export function symmetryAxis(theta: number, phi: number): Vector3 {
  const sinTheta = Math.sin(theta);
  return new Vector3(sinTheta * Math.cos(phi), sinTheta * Math.sin(phi), Math.cos(theta));
}

/**
 * Orthonormal basis of the wheel plane (both ⊥ n̂). e₁ is the horizontal line of
 * nodes, so the body's spin angle ψ is measured from it; e₂ completes the frame.
 */
export function wheelFrame(theta: number, phi: number): { e1: Vector3; e2: Vector3 } {
  const sinPhi = Math.sin(phi);
  const cosPhi = Math.cos(phi);
  const sinTheta = Math.sin(theta);
  const cosTheta = Math.cos(theta);
  return {
    e1: new Vector3(-sinPhi, cosPhi, 0),
    e2: new Vector3(-cosTheta * cosPhi, -cosTheta * sinPhi, sinTheta),
  };
}

/** Project a world point (in meters, relative to the pivot) into view pixels. */
export function projectPoint(projection: TopProjection, point: Vector3): Vector2 {
  const s = projection.pxPerM;
  return new Vector2(
    projection.pivot.x + s * point.x,
    projection.pivot.y - s * point.z + s * projection.perspective * point.y,
  );
}

/** Project a world direction — the same linear map without the pivot translation. */
export function projectDirection(projection: TopProjection, direction: Vector3): Vector2 {
  const s = projection.pxPerM;
  return new Vector2(s * direction.x, -s * direction.z + s * projection.perspective * direction.y);
}

/** View position of a point at `distance` meters along the symmetry axis. */
export function projectAxisPoint(projection: TopProjection, theta: number, phi: number, distance: number): Vector2 {
  return projectPoint(projection, symmetryAxis(theta, phi).timesScalar(distance));
}

/**
 * Polygon approximating the projected wheel rim: a circle of the given radius,
 * centered `comDistance` along the axis and lying in the plane ⊥ to the axis.
 */
export function wheelRimPoints(
  projection: TopProjection,
  theta: number,
  phi: number,
  comDistance: number,
  radius: number,
  pointCount = 48,
): Vector2[] {
  const center = projectAxisPoint(projection, theta, phi, comDistance);
  const { e1, e2 } = wheelFrame(theta, phi);
  const a = projectDirection(projection, e1).timesScalar(radius);
  const b = projectDirection(projection, e2).timesScalar(radius);

  const points: Vector2[] = [];
  for (let i = 0; i < pointCount; i++) {
    const angle = (i / pointCount) * 2 * Math.PI;
    points.push(
      new Vector2(
        center.x + a.x * Math.cos(angle) + b.x * Math.sin(angle),
        center.y + a.y * Math.cos(angle) + b.y * Math.sin(angle),
      ),
    );
  }
  return points;
}

/** View position of the rim point at body spin angle ψ, used to draw the spin marker. */
export function projectRimPoint(
  projection: TopProjection,
  theta: number,
  phi: number,
  comDistance: number,
  radius: number,
  psi: number,
): Vector2 {
  const center = projectAxisPoint(projection, theta, phi, comDistance);
  const { e1, e2 } = wheelFrame(theta, phi);
  const a = projectDirection(projection, e1).timesScalar(radius * Math.cos(psi));
  const b = projectDirection(projection, e2).timesScalar(radius * Math.sin(psi));
  return new Vector2(center.x + a.x + b.x, center.y + a.y + b.y);
}

/**
 * The two rim points on the projected silhouette — the ones furthest from the
 * projected axis line. Drawing the axle-to-rim triangle through these gives the
 * wheel a solid hub without a full 3-D renderer.
 */
export function wheelSilhouette(
  projection: TopProjection,
  theta: number,
  phi: number,
  comDistance: number,
  radius: number,
): [Vector2, Vector2] {
  const axis = projectDirection(projection, symmetryAxis(theta, phi));
  const { e1, e2 } = wheelFrame(theta, phi);
  const a = projectDirection(projection, e1).timesScalar(radius);
  const b = projectDirection(projection, e2).timesScalar(radius);

  // Maximize |(a cos α + b sin α) × â| over α.
  const crossA = a.x * axis.y - a.y * axis.x;
  const crossB = b.x * axis.y - b.y * axis.x;
  const alpha = Math.atan2(crossB, crossA);

  const center = projectAxisPoint(projection, theta, phi, comDistance);
  const offsetX = a.x * Math.cos(alpha) + b.x * Math.sin(alpha);
  const offsetY = a.y * Math.cos(alpha) + b.y * Math.sin(alpha);
  return [new Vector2(center.x + offsetX, center.y + offsetY), new Vector2(center.x - offsetX, center.y - offsetY)];
}

/**
 * Projected outline of the horizontal circle traced by a point at `distance`
 * along the axis when the tilt is held at θ — the boundary of the nutation band.
 */
export function projectTiltCircle(
  projection: TopProjection,
  theta: number,
  distance: number,
): { center: Vector2; radiusX: number; radiusY: number } {
  const s = projection.pxPerM;
  const horizontal = distance * Math.sin(theta) * s;
  return {
    center: new Vector2(projection.pivot.x, projection.pivot.y - distance * Math.cos(theta) * s),
    radiusX: horizontal,
    radiusY: horizontal * projection.perspective,
  };
}
