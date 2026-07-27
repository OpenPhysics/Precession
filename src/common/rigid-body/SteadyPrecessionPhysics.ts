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

export function spinAxisInertia(parameters: SteadyPrecessionParameters): number {
  const armInertia = parameters.armMass * parameters.pivotToMassDistance * parameters.pivotToMassDistance;
  return parameters.diskInertia + armInertia;
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
 * Steady-state precession rate from τ = Ω × L → Ω = τ / (I ω) for a symmetric top.
 */
export function predictedPrecessionRate(parameters: SteadyPrecessionParameters): number {
  const torque = torqueMagnitude(parameters);
  const inertia = spinAxisInertia(parameters);
  const spinRate = Math.abs(parameters.spinRate);
  if (torque === 0 || spinRate < MIN_SPIN_RATE || inertia <= 0) {
    return 0;
  }
  return torque / (inertia * spinRate);
}

export function steadyPrecessionVectors(parameters: SteadyPrecessionParameters): SteadyPrecessionVectors {
  return {
    torqueMagnitude: torqueMagnitude(parameters),
    angularMomentumMagnitude: angularMomentumMagnitude(parameters),
    predictedPrecessionRate: predictedPrecessionRate(parameters),
    centerOfMassDistance: centerOfMassDistance(parameters),
    totalMass: totalMass(parameters),
    spinAxisInertia: spinAxisInertia(parameters),
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
