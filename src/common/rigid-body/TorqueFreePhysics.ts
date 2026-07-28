/**
 * TorqueFreePhysics.ts
 *
 * Euler's equations for a rigid body with no torque on it, plus the quaternion that
 * carries the body's orientation.
 *
 * With the axes chosen along the principal directions and no applied torque,
 *
 *   I₁ ω̇₁ = (I₂ − I₃) ω₂ ω₃
 *   I₂ ω̇₂ = (I₃ − I₁) ω₃ ω₁
 *   I₃ ω̇₃ = (I₁ − I₂) ω₁ ω₂
 *
 * Two things are conserved: the kinetic energy 2T = Σ Iᵢ ωᵢ², and the magnitude of
 * the angular momentum L² = Σ Iᵢ² ωᵢ². In the space of ω those are two ellipsoids,
 * and ω is forced to travel along their intersection — the *polhode*. Around the
 * largest and smallest inertia axes the intersections are small closed loops, so a
 * body spun about either of those just wobbles. Around the intermediate axis they
 * are separatrix curves that sweep right across the ellipsoid, and the body
 * periodically flips end over end. That is the tennis-racket theorem, and it is what
 * this screen is for.
 *
 * The flip is *not* a numerical artifact and *not* a loss of energy: both invariants
 * hold throughout, which is why the model surfaces them as readouts.
 */

import { Vector3 } from "scenerystack/dot";

export type InertiaTensor = {
  /** Principal moment about the body's x axis (kg·m²). */
  readonly i1: number;
  /** Principal moment about the body's y axis (kg·m²). */
  readonly i2: number;
  /** Principal moment about the body's z axis (kg·m²). */
  readonly i3: number;
};

/**
 * Unit quaternion carrying body coordinates into world coordinates. Kept as a plain
 * record rather than dot's `Quaternion` so every component is a definite number and
 * the integrator can build intermediate, deliberately non-unit values.
 */
export type Rotation = {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly w: number;
};

export const IDENTITY_ROTATION: Rotation = { x: 0, y: 0, z: 0, w: 1 };

export type TorqueFreeState = {
  /** Angular velocity in the *body* frame (rad/s). */
  readonly omega: Vector3;
  /** Rotation carrying body coordinates into world coordinates. */
  readonly orientation: Rotation;
};

/** Rotate a body-frame vector into world coordinates. */
export function rotateToWorld(q: Rotation, v: Vector3): Vector3 {
  // v + 2 q_vec × (q_vec × v + w v), the standard quaternion sandwich without
  // building a matrix.
  const tx = 2 * (q.y * v.z - q.z * v.y);
  const ty = 2 * (q.z * v.x - q.x * v.z);
  const tz = 2 * (q.x * v.y - q.y * v.x);
  return new Vector3(
    v.x + q.w * tx + (q.y * tz - q.z * ty),
    v.y + q.w * ty + (q.z * tx - q.x * tz),
    v.z + q.w * tz + (q.x * ty - q.y * tx),
  );
}

function normalizeRotation(q: Rotation): Rotation {
  const magnitude = Math.sqrt(q.x * q.x + q.y * q.y + q.z * q.z + q.w * q.w);
  if (magnitude === 0) {
    return IDENTITY_ROTATION;
  }
  return { x: q.x / magnitude, y: q.y / magnitude, z: q.z / magnitude, w: q.w / magnitude };
}

/** Internal substep (s). Small enough that the flips stay reversible over minutes. */
const SUBSTEP_S = 0.001;

/**
 * Principal moments of a uniform rectangular block with the given full side lengths.
 * A block is the right body for this screen: its three moments are visibly different,
 * and unlike an abstract ellipsoid you can see which way up it is.
 */
export function boxInertia(mass: number, sizeX: number, sizeY: number, sizeZ: number): InertiaTensor {
  const k = mass / 12;
  return {
    i1: k * (sizeY * sizeY + sizeZ * sizeZ),
    i2: k * (sizeZ * sizeZ + sizeX * sizeX),
    i3: k * (sizeX * sizeX + sizeY * sizeY),
  };
}

/** dω/dt from Euler's equations. */
function omegaDerivative(inertia: InertiaTensor, omega: Vector3): Vector3 {
  return new Vector3(
    ((inertia.i2 - inertia.i3) * omega.y * omega.z) / inertia.i1,
    ((inertia.i3 - inertia.i1) * omega.z * omega.x) / inertia.i2,
    ((inertia.i1 - inertia.i2) * omega.x * omega.y) / inertia.i3,
  );
}

/**
 * dq/dt for a body spinning at ω *expressed in the body frame*: q̇ = ½ q ⊗ ω.
 * (The body-frame form puts the quaternion on the left; the world-frame form would
 * put it on the right. Getting this backwards makes the box counter-rotate.)
 */
function orientationDerivative(q: Rotation, omega: Vector3): Rotation {
  const { x: wx, y: wy, z: wz } = omega;
  return {
    x: 0.5 * (q.w * wx + q.y * wz - q.z * wy),
    y: 0.5 * (q.w * wy + q.z * wx - q.x * wz),
    z: 0.5 * (q.w * wz + q.x * wy - q.y * wx),
    w: 0.5 * (-q.x * wx - q.y * wy - q.z * wz),
  };
}

function addScaled(base: Rotation, delta: Rotation, scale: number): Rotation {
  return {
    x: base.x + delta.x * scale,
    y: base.y + delta.y * scale,
    z: base.z + delta.z * scale,
    w: base.w + delta.w * scale,
  };
}

/** One RK4 substep of the coupled (ω, q) system. */
function substep(inertia: InertiaTensor, state: TorqueFreeState, dt: number): TorqueFreeState {
  const { omega, orientation } = state;

  const k1w = omegaDerivative(inertia, omega);
  const k1q = orientationDerivative(orientation, omega);

  const w2 = omega.plus(k1w.timesScalar(dt / 2));
  const q2 = addScaled(orientation, k1q, dt / 2);
  const k2w = omegaDerivative(inertia, w2);
  const k2q = orientationDerivative(q2, w2);

  const w3 = omega.plus(k2w.timesScalar(dt / 2));
  const q3 = addScaled(orientation, k2q, dt / 2);
  const k3w = omegaDerivative(inertia, w3);
  const k3q = orientationDerivative(q3, w3);

  const w4 = omega.plus(k3w.timesScalar(dt));
  const q4 = addScaled(orientation, k3q, dt);
  const k4w = omegaDerivative(inertia, w4);
  const k4q = orientationDerivative(q4, w4);

  const nextOmega = omega.plus(
    k1w
      .plus(k2w.timesScalar(2))
      .plus(k3w.timesScalar(2))
      .plus(k4w)
      .timesScalar(dt / 6),
  );
  const summedQ: Rotation = {
    x: k1q.x + 2 * k2q.x + 2 * k3q.x + k4q.x,
    y: k1q.y + 2 * k2q.y + 2 * k3q.y + k4q.y,
    z: k1q.z + 2 * k2q.z + 2 * k3q.z + k4q.z,
    w: k1q.w + 2 * k2q.w + 2 * k3q.w + k4q.w,
  };

  // Renormalize: RK4 on a quaternion drifts off the unit sphere, and a non-unit
  // quaternion shears the box instead of rotating it.
  const nextOrientation = normalizeRotation(addScaled(orientation, summedQ, dt / 6));

  return { omega: nextOmega, orientation: nextOrientation };
}

/** Advance the state by `dt`, subdividing to keep the integration accurate. */
export function stepTorqueFree(inertia: InertiaTensor, state: TorqueFreeState, dt: number): TorqueFreeState {
  if (dt <= 0) {
    return state;
  }
  const steps = Math.max(1, Math.ceil(dt / SUBSTEP_S));
  const h = dt / steps;
  let current = state;
  for (let i = 0; i < steps; i++) {
    current = substep(inertia, current, h);
  }
  return current;
}

/** Rotational kinetic energy T = ½ Σ Iᵢ ωᵢ² (J) — conserved. */
export function kineticEnergy(inertia: InertiaTensor, omega: Vector3): number {
  return 0.5 * (inertia.i1 * omega.x ** 2 + inertia.i2 * omega.y ** 2 + inertia.i3 * omega.z ** 2);
}

/** Angular momentum in the body frame (kg·m²/s). */
export function bodyAngularMomentum(inertia: InertiaTensor, omega: Vector3): Vector3 {
  return new Vector3(inertia.i1 * omega.x, inertia.i2 * omega.y, inertia.i3 * omega.z);
}

/** |L| (kg·m²/s) — conserved, and its *direction* is fixed in space as well. */
export function angularMomentumMagnitude(inertia: InertiaTensor, omega: Vector3): number {
  return bodyAngularMomentum(inertia, omega).magnitude;
}

/**
 * Cosine of the angle between L and the given principal axis, i.e. that axis's share
 * of the angular momentum: (Iᵢ ωᵢ) / |L|.
 *
 * Because L is fixed in space, this is the cleanest signature of a flip available
 * without touching the orientation. A body launched about axis i starts at +1 and,
 * if that axis is the intermediate one, swings to −1 and back forever; about a stable
 * axis it stays pinned near +1. Returns 0 for a body that is not rotating.
 */
export function axisMomentumAlignment(inertia: InertiaTensor, omega: Vector3, axis: 0 | 1 | 2): number {
  const momentum = bodyAngularMomentum(inertia, omega);
  const magnitude = momentum.magnitude;
  if (magnitude < 1e-12) {
    return 0;
  }
  const components = [momentum.x, momentum.y, momentum.z];
  return (components[axis] as number) / magnitude;
}

/**
 * Whether a spin about the given principal axis is stable.
 *
 * Linearizing Euler's equations about pure rotation ωᵢ gives growth rate² ∝
 * (Iᵢ − Iⱼ)(Iᵢ − Iₖ) / (Iⱼ Iₖ). That product is positive — oscillatory, hence stable —
 * when Iᵢ is the largest or the smallest of the three, and negative — exponentially
 * growing — when it is the one in the middle.
 */
export function isAxisStable(inertia: InertiaTensor, axis: 0 | 1 | 2): boolean {
  const moments = [inertia.i1, inertia.i2, inertia.i3];
  const own = moments[axis] as number;
  const others = moments.filter((_, index) => index !== axis) as [number, number];
  return (own - others[0]) * (own - others[1]) > 0;
}

/** Index of the intermediate principal axis — the unstable one. */
export function intermediateAxis(inertia: InertiaTensor): 0 | 1 | 2 {
  const indices: Array<0 | 1 | 2> = [0, 1, 2];
  return indices.find((axis) => !isAxisStable(inertia, axis)) ?? 1;
}

/**
 * Growth rate of a small disturbance about the intermediate axis (1/s) — how fast the
 * flips build up. Zero for the stable axes, where disturbances merely oscillate.
 */
export function instabilityGrowthRate(inertia: InertiaTensor, axis: 0 | 1 | 2, spinRate: number): number {
  const moments = [inertia.i1, inertia.i2, inertia.i3];
  const own = moments[axis] as number;
  const others = moments.filter((_, index) => index !== axis) as [number, number];
  const product = ((own - others[0]) * (own - others[1])) / (others[0] * others[1]);
  return product < 0 ? Math.abs(spinRate) * Math.sqrt(-product) : 0;
}
