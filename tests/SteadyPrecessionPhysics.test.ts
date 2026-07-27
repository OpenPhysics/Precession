/**
 * SteadyPrecessionPhysics.test.ts
 */

import { describe, expect, it } from "vitest";
import {
  centerOfMassDistance,
  predictedPrecessionRate,
  type SteadyPrecessionParameters,
  stepSteadyPrecession,
  torqueMagnitude,
} from "../src/common/rigid-body/SteadyPrecessionPhysics.js";
import {
  DEFAULT_ARM_MASS_KG,
  DEFAULT_PIVOT_TO_MASS_DISTANCE_M,
  DEFAULT_SPIN_RATE_RAD_S,
  DEFAULT_TILT_ANGLE_RAD,
  DISK_INERTIA_KG_M2,
  DISK_MASS_KG,
  DISK_POSITION_FROM_PIVOT_M,
  GRAVITY_MPS2,
  SPIN_UP_TIME_CONSTANT_S,
} from "../src/RigidBodyPrecessionConstants.js";

function baseParameters(overrides: Partial<SteadyPrecessionParameters> = {}): SteadyPrecessionParameters {
  return {
    spinRateTarget: DEFAULT_SPIN_RATE_RAD_S,
    spinRate: DEFAULT_SPIN_RATE_RAD_S,
    armMass: DEFAULT_ARM_MASS_KG,
    pivotToMassDistance: DEFAULT_PIVOT_TO_MASS_DISTANCE_M,
    pivotAtCenterOfMass: false,
    tiltAngle: DEFAULT_TILT_ANGLE_RAD,
    diskMass: DISK_MASS_KG,
    diskInertia: DISK_INERTIA_KG_M2,
    diskPositionFromPivot: DISK_POSITION_FROM_PIVOT_M,
    gravity: GRAVITY_MPS2,
    ...overrides,
  };
}

describe("SteadyPrecessionPhysics", () => {
  it("computes center of mass along the axle", () => {
    const parameters = baseParameters();
    const d = centerOfMassDistance(parameters);
    const expected =
      (DISK_MASS_KG * DISK_POSITION_FROM_PIVOT_M + DEFAULT_ARM_MASS_KG * DEFAULT_PIVOT_TO_MASS_DISTANCE_M) /
      (DISK_MASS_KG + DEFAULT_ARM_MASS_KG);
    expect(d).toBeCloseTo(expected, 6);
  });

  it("returns zero torque when pivot is at center of mass", () => {
    const parameters = baseParameters({ pivotAtCenterOfMass: true });
    expect(torqueMagnitude(parameters)).toBe(0);
    expect(predictedPrecessionRate(parameters)).toBe(0);
  });

  it("predicts slower precession for faster spin (Ω = τ / Iω)", () => {
    const slowSpin = baseParameters({ spinRate: 20 });
    const fastSpin = baseParameters({ spinRate: 80 });
    const omegaSlow = predictedPrecessionRate(slowSpin);
    const omegaFast = predictedPrecessionRate(fastSpin);
    expect(omegaSlow).toBeGreaterThan(0);
    expect(omegaFast).toBeGreaterThan(0);
    expect(omegaSlow).toBeGreaterThan(omegaFast);
    expect(omegaSlow / omegaFast).toBeCloseTo(4, 1);
  });

  it("advances precession angle linearly at steady state", () => {
    const parameters = baseParameters();
    let state = { precessionAngle: 0, spinAngle: 0, spinRate: DEFAULT_SPIN_RATE_RAD_S };
    const dt = 0.02;
    const samples: number[] = [];

    for (let i = 0; i < 200; i++) {
      state = stepSteadyPrecession(parameters, state, dt, SPIN_UP_TIME_CONSTANT_S);
      samples.push(state.precessionAngle);
    }

    const sampleAt = (index: number): number => samples[index] ?? 0;
    const slopeEarly = (sampleAt(50) - sampleAt(10)) / ((50 - 10) * dt);
    const slopeLate = (sampleAt(190) - sampleAt(150)) / ((190 - 150) * dt);
    expect(slopeLate).toBeCloseTo(predictedPrecessionRate(parameters), 2);
    expect(Math.abs(slopeLate - slopeEarly)).toBeLessThan(0.05 * Math.abs(slopeLate));
  });
});
