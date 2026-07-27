/**
 * GyroscopeKinematics.ts
 *
 * Shared 2D projection math for the steady-precession gyroscope views.
 * Keeps the schematic scene and vector diagram geometrically consistent.
 */

import { Vector2 } from "scenerystack/dot";

export type AxleGeometry = {
  /** Pivot point in view coordinates. */
  readonly pivot: Vector2;
  /** Point along axle at unit distance (direction only). */
  readonly axleDirection: Vector2;
  /** Tip of the axle at the arm-mass distance. */
  readonly massTip: Vector2;
  /** Disk center along the axle. */
  readonly diskCenter: Vector2;
  /** Center of the precession circle traced by the axle tip (horizontal plane). */
  readonly orbitCenter: Vector2;
  /** Horizontal radius of the tip orbit in view pixels. */
  readonly orbitRadiusX: number;
  /** Depth-foreshortened vertical radius of the tip orbit. */
  readonly orbitRadiusY: number;
  /** Angle of the axle from horizontal in the view (rad). */
  readonly axleAngle: number;
};

export type VectorDiagramGeometry = {
  readonly pivot: Vector2;
  readonly axleTip: Vector2;
  readonly momentumTip: Vector2;
  readonly orbitCenter: Vector2;
  readonly orbitRadius: number;
  /** Unit vector tangent to the L-tip orbit (direction of dL/dt = τ). */
  readonly torqueDirection: Vector2;
  readonly hasTorque: boolean;
};

/**
 * Project a point along the axle into the schematic side view.
 *
 * @param pivot - Pivot location in view pixels
 * @param distanceM - Distance along axle from pivot (m)
 * @param phi - Precession angle (rad)
 * @param tilt - Axle tilt from vertical (rad)
 * @param pxPerM - Scale factor (m → px)
 * @param perspective - Foreshortening of the depth axis (0–1)
 */
export function projectAxlePoint(
  pivot: Vector2,
  distanceM: number,
  phi: number,
  tilt: number,
  pxPerM: number,
  perspective: number,
): Vector2 {
  const along = distanceM * pxPerM;
  return new Vector2(
    pivot.x + along * Math.sin(tilt) * Math.cos(phi),
    pivot.y - along * Math.cos(tilt) + along * Math.sin(tilt) * Math.sin(phi) * perspective,
  );
}

export function computeAxleGeometry(
  pivot: Vector2,
  phi: number,
  tilt: number,
  massDistanceM: number,
  diskDistanceM: number,
  pxPerM: number,
  perspective: number,
): AxleGeometry {
  const massTip = projectAxlePoint(pivot, massDistanceM, phi, tilt, pxPerM, perspective);
  const diskCenter = projectAxlePoint(pivot, diskDistanceM, phi, tilt, pxPerM, perspective);
  const orbitRadiusX = massDistanceM * pxPerM * Math.sin(tilt);
  const orbitRadiusY = orbitRadiusX * perspective;
  const orbitCenter = new Vector2(pivot.x, pivot.y - massDistanceM * pxPerM * Math.cos(tilt));
  const axleAngle = Math.atan2(massTip.y - pivot.y, massTip.x - pivot.x);
  const axleDirection = Vector2.createPolar(1, axleAngle);

  return {
    pivot,
    axleDirection,
    massTip,
    diskCenter,
    orbitCenter,
    orbitRadiusX,
    orbitRadiusY,
    axleAngle,
  };
}

/**
 * Side-view vector diagram geometry (no depth foreshortening on τ).
 */
export function computeVectorDiagramGeometry(
  pivot: Vector2,
  phi: number,
  tilt: number,
  axleLengthPx: number,
  momentumLengthPx: number,
  hasTorque: boolean,
): VectorDiagramGeometry {
  const axleTip = new Vector2(
    pivot.x + axleLengthPx * Math.sin(tilt) * Math.cos(phi),
    pivot.y - axleLengthPx * Math.cos(tilt),
  );
  const momentumTip = new Vector2(
    pivot.x + momentumLengthPx * Math.sin(tilt) * Math.cos(phi),
    pivot.y - momentumLengthPx * Math.cos(tilt),
  );
  const orbitRadius = momentumLengthPx * Math.sin(tilt);
  const orbitCenter = new Vector2(pivot.x, pivot.y - momentumLengthPx * Math.cos(tilt));

  // Tangent to the horizontal precession circle: (-sin φ, 0) in the side view
  const torqueDirection = hasTorque ? new Vector2(-Math.sin(phi), 0).normalized() : Vector2.ZERO;

  return {
    pivot,
    axleTip,
    momentumTip,
    orbitCenter,
    orbitRadius,
    torqueDirection,
    hasTorque,
  };
}
