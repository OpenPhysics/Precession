/**
 * SteadyPrecessionPhysics.test.ts
 */

import { describe, expect, it } from "vitest";
import {
  centerOfMassDistance,
  GYROSCOPIC_RATIO_LIMIT,
  gyroscopicRatio,
  predictedPrecessionRate,
  type SteadyPrecessionParameters,
  spinAxisInertia,
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
  SPIN_RATE_RANGE,
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

  it("gives a precession rate independent of the tilt", () => {
    // Ω = τ/(L sin θ) = Mgl/(I₃ω): the sin θ in the torque and the sin θ in the
    // horizontal part of L cancel. This is the screen's headline result.
    const rates = [15, 30, 45, 60, 80].map((degrees) =>
      predictedPrecessionRate(baseParameters({ tiltAngle: (degrees * Math.PI) / 180 })),
    );
    const first = rates[0] as number;
    expect(first).toBeGreaterThan(0);
    for (const rate of rates) {
      expect(rate).toBeCloseTo(first, 12);
    }
  });

  it("still makes the torque grow with the tilt", () => {
    // Only Ω is tilt-independent; τ itself is Mgl sin θ and very much is not.
    const shallow = torqueMagnitude(baseParameters({ tiltAngle: Math.PI / 12 }));
    const steep = torqueMagnitude(baseParameters({ tiltAngle: Math.PI / 2 }));
    expect(steep).toBeGreaterThan(shallow);
  });

  it("precesses faster with a heavier counterweight", () => {
    // The counterweight rides on the symmetry axis, so it adds torque but no spin
    // inertia. Getting that wrong makes the mass slider do almost nothing.
    const light = predictedPrecessionRate(baseParameters({ armMass: 0.1 }));
    const heavy = predictedPrecessionRate(baseParameters({ armMass: 1.0 }));
    expect(heavy).toBeGreaterThan(light * 1.5);
  });

  it("precesses faster with the counterweight further out", () => {
    const near = predictedPrecessionRate(baseParameters({ pivotToMassDistance: 0.45 }));
    const far = predictedPrecessionRate(baseParameters({ pivotToMassDistance: 0.78 }));
    expect(far).toBeGreaterThan(near);
  });

  it("keeps the spin inertia free of the counterweight", () => {
    expect(spinAxisInertia(baseParameters({ armMass: 0.1 }))).toBe(DISK_INERTIA_KG_M2);
    expect(spinAxisInertia(baseParameters({ armMass: 1.0 }))).toBe(DISK_INERTIA_KG_M2);
  });

  it("flags the fast-top idealization as stretched at low spin", () => {
    const fast = baseParameters({ spinRate: SPIN_RATE_RANGE.max, spinRateTarget: SPIN_RATE_RANGE.max });
    const slow = baseParameters({
      spinRate: SPIN_RATE_RANGE.min,
      spinRateTarget: SPIN_RATE_RANGE.min,
      armMass: 1.0,
      pivotToMassDistance: 0.78,
    });
    expect(gyroscopicRatio(fast)).toBeLessThan(GYROSCOPIC_RATIO_LIMIT);
    expect(gyroscopicRatio(slow)).toBeGreaterThan(GYROSCOPIC_RATIO_LIMIT);
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
