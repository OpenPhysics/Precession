/**
 * SteadyPrecessionPhysics.ts
 *
 * Pure functions for a symmetric gyroscope in steady precession under gravity.
 * Screen 2 (nutation) and Screen 3 (torque-free) will extend the shared rigid-body
 * integrator; Screen 1 uses the idealized Ω = τ / (I ω) relation.
 */

export type SteadyPrecessionParameters = {
  /** Target spin rate about the axle (rad/s). */
  readonly spinRateTarget: number;
  /** Current spin rate about the axle (rad/s), which may lag during spin-up. */
  readonly spinRate: number;
  /** Point-mass on the far end of the arm (kg). */
  readonly armMass: number;
  /** Distance from pivot to the arm mass along the axle (m). */
  readonly pivotToMassDistance: number;
  /** When true, the pivot is placed at the center of mass (zero torque). */
  readonly pivotAtCenterOfMass: boolean;
  /** Fixed tilt of the axle from vertical (rad). */
  readonly tiltAngle: number;
  /** Mass of the spinning disk (kg). */
  readonly diskMass: number;
  /** Moment of inertia of the disk about its spin axis (kg·m²). */
  readonly diskInertia: number;
  /** Distance from pivot to disk center along the axle (m). */
  readonly diskPositionFromPivot: number;
  /** Gravitational acceleration (m/s²). */
  readonly gravity: number;
};

export type SteadyPrecessionState = {
  readonly precessionAngle: number;
  readonly spinAngle: number;
  readonly spinRate: number;
};

export type SteadyPrecessionVectors = {
  /** Gravitational torque magnitude about the pivot (N·m). */
  readonly torqueMagnitude: number;
  /** Spin angular momentum magnitude (kg·m²/s). */
  readonly angularMomentumMagnitude: number;
  /** Predicted steady precession rate Ω = τ / (I ω) (rad/s). */
  readonly predictedPrecessionRate: number;
  /** Distance from pivot to center of mass along the axle (m). */
  readonly centerOfMassDistance: number;
  /** Total mass (kg). */
  readonly totalMass: number;
  /** Moment of inertia about the spin axis (kg·m²). */
  readonly spinAxisInertia: number;
  /** Ω / ω — small while the fast-top idealization holds. */
  readonly gyroscopicRatio: number;
};

const MIN_SPIN_RATE = 1e-3;
const MIN_CENTER_OF_MASS_DISTANCE = 1e-6;

export function totalMass(parameters: SteadyPrecessionParameters): number {
  return parameters.diskMass + parameters.armMass;
}

export function centerOfMassDistance(parameters: SteadyPrecessionParameters): number {
  if (parameters.pivotAtCenterOfMass) {
    return 0;
  }
  const mass = totalMass(parameters);
  if (mass <= 0) {
    return 0;
  }
  return (
    (parameters.diskMass * parameters.diskPositionFromPivot + parameters.armMass * parameters.pivotToMassDistance) /
    mass
  );
}

/**
 * Moment of inertia about the *spin* axis. The arm mass rides on the axle, i.e. on
 * the symmetry axis itself, so its distance from that axis is zero and it adds
 * nothing here — sliding it outward changes the torque, not the spin inertia. (It
 * does add M l² about the transverse axis, but that inertia plays no part in
 * steady precession.)
 */
export function spinAxisInertia(parameters: SteadyPrecessionParameters): number {
  return parameters.diskInertia;
}

export function torqueMagnitude(parameters: SteadyPrecessionParameters): number {
  const leverArm = centerOfMassDistance(parameters);
  if (leverArm < MIN_CENTER_OF_MASS_DISTANCE) {
    return 0;
  }
  return totalMass(parameters) * parameters.gravity * leverArm * Math.sin(parameters.tiltAngle);
}

export function angularMomentumMagnitude(parameters: SteadyPrecessionParameters): number {
  return spinAxisInertia(parameters) * Math.abs(parameters.spinRate);
}

/**
 * Steady precession rate dφ/dt.
 *
 * τ = dL/dt with L along the axle gives τ = Ω × L. Both τ and the swing of L are
 * horizontal, and the horizontal part of L has magnitude L sin θ, so
 *
 *   Ω = τ / (L sin θ) = (M g l sin θ) / (I₃ ω sin θ) = M g l / (I₃ ω).
 *
 * The two sin θ factors cancel: **the precession rate does not depend on the tilt**.
 * A gyroscope leaning far over precesses at exactly the rate it does when nearly
 * upright — one of the least intuitive results in rigid-body mechanics, and the
 * reason this screen offers a tilt control.
 */
export function predictedPrecessionRate(parameters: SteadyPrecessionParameters): number {
  const leverArm = centerOfMassDistance(parameters);
  const inertia = spinAxisInertia(parameters);
  const spinRate = Math.abs(parameters.spinRate);
  if (leverArm < MIN_CENTER_OF_MASS_DISTANCE || spinRate < MIN_SPIN_RATE || inertia <= 0) {
    return 0;
  }
  return (totalMass(parameters) * parameters.gravity * leverArm) / (inertia * spinRate);
}

/**
 * Ω / ω — how badly the "fast top" assumption is being stretched. The steady formula
 * drops the transverse angular momentum the precession itself carries, which is only
 * legitimate while this stays small. Past a few percent the real top nutates instead,
 * which is what Screen 2 integrates.
 */
export function gyroscopicRatio(parameters: SteadyPrecessionParameters): number {
  const spinRate = Math.abs(parameters.spinRate);
  if (spinRate < MIN_SPIN_RATE) {
    return Number.POSITIVE_INFINITY;
  }
  return predictedPrecessionRate(parameters) / spinRate;
}

/** Above this Ω/ω the readouts warn that the idealization has broken down. */
export const GYROSCOPIC_RATIO_LIMIT = 0.08;

export function steadyPrecessionVectors(parameters: SteadyPrecessionParameters): SteadyPrecessionVectors {
  return {
    torqueMagnitude: torqueMagnitude(parameters),
    angularMomentumMagnitude: angularMomentumMagnitude(parameters),
    predictedPrecessionRate: predictedPrecessionRate(parameters),
    centerOfMassDistance: centerOfMassDistance(parameters),
    totalMass: totalMass(parameters),
    spinAxisInertia: spinAxisInertia(parameters),
    gyroscopicRatio: gyroscopicRatio(parameters),
  };
}

/**
 * First-order spin-up toward the target rate. Returns the updated spin rate.
 */
export function advanceSpinRate(
  currentSpinRate: number,
  targetSpinRate: number,
  dt: number,
  spinUpTimeConstant: number,
): number {
  if (spinUpTimeConstant <= 0) {
    return targetSpinRate;
  }
  const blend = 1 - Math.exp(-dt / spinUpTimeConstant);
  return currentSpinRate + (targetSpinRate - currentSpinRate) * blend;
}

/**
 * Integrate precession and spin angles for one timestep.
 */
export function stepSteadyPrecession(
  parameters: SteadyPrecessionParameters,
  state: SteadyPrecessionState,
  dt: number,
  spinUpTimeConstant: number,
): SteadyPrecessionState {
  const spinRate = advanceSpinRate(state.spinRate, parameters.spinRateTarget, dt, spinUpTimeConstant);
  const steppedParameters: SteadyPrecessionParameters = { ...parameters, spinRate };
  const omega = predictedPrecessionRate(steppedParameters);

  return {
    precessionAngle: state.precessionAngle + omega * dt,
    spinAngle: state.spinAngle + spinRate * dt,
    spinRate,
  };
}
