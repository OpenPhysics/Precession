/**
 * CylinderShapes.ts
 *
 * A short cylinder — the wheel, the counterweight collar, the stand post — is the
 * only solid this sim needs to draw, so its silhouette is worked out once here.
 *
 * The outline is the convex hull of the two projected cap circles. For a projected
 * circle p(α) = a cos α + b sin α and a cap-to-cap screen offset o, that hull is the
 * half of the far cap facing −ô joined to the half of the near cap facing +ô.
 * Writing p(α)·ô = M cos(α − α₁) with α₁ = atan2(b·ô, a·ô), the half facing +ô is
 * exactly α ∈ (α₁ − π/2, α₁ + π/2), and the two joining points are the silhouette
 * points where the ellipse tangent runs parallel to o. No approximation, any tilt.
 */

import type { Vector3 } from "scenerystack/dot";
import { Shape } from "scenerystack/kite";
import {
  type Camera3D,
  circleArcPoints,
  depth,
  type ProjectedCircle,
  projectCircle,
  projectDirection,
} from "./Camera3D.js";

export type CylinderShapes = {
  /** Side band, or null when the cylinder is seen close enough to end-on to have none. */
  readonly band: Shape | null;
  /** Filled outline of the cap facing the camera. */
  readonly cap: Shape;
  /** The camera-facing cap as a projected circle, for markings drawn on it. */
  readonly nearCap: ProjectedCircle;
  /** Outward normal of the camera-facing cap. */
  readonly capNormal: Vector3;
  /** Center of the camera-facing cap in world coordinates. */
  readonly nearCapCenter: Vector3;
};

/** Below this projected cap separation the two circles coincide and there is no band. */
const BAND_EPSILON = 0.35;

/**
 * @param camera
 * @param axis - unit vector along the cylinder's axis
 * @param e1 - unit vector ⊥ axis
 * @param e2 - unit vector ⊥ axis and ⊥ e1
 * @param center - midpoint of the cylinder's axis (m)
 * @param radius - cap radius (m)
 * @param halfLength - half the cylinder's length along the axis (m)
 * @param samples - polyline samples per full cap circle
 */
export function cylinderShapes(
  camera: Camera3D,
  axis: Vector3,
  e1: Vector3,
  e2: Vector3,
  center: Vector3,
  radius: number,
  halfLength: number,
  samples = 64,
): CylinderShapes {
  const plusCenter = center.plus(axis.timesScalar(halfLength));
  const minusCenter = center.minus(axis.timesScalar(halfLength));
  const plusCircle = projectCircle(camera, plusCenter, e1, e2, radius);
  const minusCircle = projectCircle(camera, minusCenter, e1, e2, radius);

  // Depth grows along +axis, so the +axis cap is the near one exactly when the axis
  // tilts toward the camera.
  const plusIsNear = depth(camera, axis) < 0;
  const nearCap = plusIsNear ? plusCircle : minusCircle;

  const offset = projectDirection(camera, axis).timesScalar(2 * halfLength);
  const offsetLength = offset.magnitude;
  let band: Shape | null = null;
  if (offsetLength >= BAND_EPSILON) {
    const unit = offset.timesScalar(1 / offsetLength);
    const alpha1 = Math.atan2(plusCircle.b.dot(unit), plusCircle.a.dot(unit));
    const half = Math.max(2, Math.round(samples / 2));
    band = Shape.polygon([
      ...circleArcPoints(plusCircle, alpha1 - Math.PI / 2, Math.PI, half),
      ...circleArcPoints(minusCircle, alpha1 + Math.PI / 2, Math.PI, half),
    ]);
  }

  return {
    band,
    cap: Shape.polygon(circleArcPoints(nearCap, 0, 2 * Math.PI, samples)),
    nearCap,
    capNormal: plusIsNear ? axis : axis.negated(),
    nearCapCenter: plusIsNear ? plusCenter : minusCenter,
  };
}
