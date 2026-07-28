/**
 * HeavySymmetricTopPhysics.test.ts
 *
 * The integrator is only trustworthy if it reproduces the analytic results for the
 * heavy symmetric top, so these tests check it against conservation laws, the
 * steady-precession fixed point, the turning points of the effective potential,
 * and the fast-top limits.
 */

import { describe, expect, it } from "vitest";
import {
  createReleaseState,
  criticalSpinRate,
  gravityTorqueCoefficient,
  type HeavyTopParameters,
  type HeavyTopState,
  isSleepingTopStable,
  nutationFrequency,
  nutationTurningPoints,
  type ReleaseMode,
  slowPrecessionRate,
  spinAngularMomentum,
  steadyPrecessionRates,
  stepHeavyTop,
  totalEnergy,
  verticalAngularMomentum,
} from "../src/common/rigid-body/HeavySymmetricTopPhysics.js";
import {
  DEFAULT_NUTATION_SPIN_RAD_S,
  DEFAULT_NUTATION_TILT_RAD,
  GRAVITY_MPS2,
  NUTATION_COM_DISTANCE_M,
  NUTATION_SPIN_DRAG_N_M_S,
  NUTATION_SPIN_INERTIA_KG_M2,
  NUTATION_TIP_DRAG_N_M_S,
  NUTATION_TRANSVERSE_INERTIA_KG_M2,
  NUTATION_WHEEL_MASS_KG,
} from "../src/RigidBodyPrecessionConstants.js";

function baseParameters(overrides: Partial<HeavyTopParameters> = {}): HeavyTopParameters {
  return {
    transverseInertia: NUTATION_TRANSVERSE_INERTIA_KG_M2,
    spinInertia: NUTATION_SPIN_INERTIA_KG_M2,
    mass: NUTATION_WHEEL_MASS_KG,
    gravity: GRAVITY_MPS2,
    comDistance: NUTATION_COM_DISTANCE_M,
    tipDrag: 0,
    spinDrag: 0,
    ...overrides,
  };
}

/** Integrate for `duration` seconds at 60 Hz, collecting the state at each frame. */
function simulate(
  parameters: HeavyTopParameters,
  initial: HeavyTopState,
  duration: number,
  dt = 1 / 60,
): HeavyTopState[] {
  const states: HeavyTopState[] = [initial];
  let state = initial;
  const frames = Math.round(duration / dt);
  for (let i = 0; i < frames; i++) {
    state = stepHeavyTop(parameters, state, dt);
    states.push(state);
  }
  return states;
}

function release(mode: ReleaseMode, parameters = baseParameters(), spin = DEFAULT_NUTATION_SPIN_RAD_S): HeavyTopState {
  return createReleaseState(parameters, spin, DEFAULT_NUTATION_TILT_RAD, mode);
}

describe("HeavySymmetricTopPhysics", () => {
  describe("conservation laws", () => {
    it("conserves energy and both angular momenta without friction", () => {
      const parameters = baseParameters();
      const initial = release("cusp");
      const states = simulate(parameters, initial, 10);

      const energy0 = totalEnergy(parameters, initial);
      const vertical0 = verticalAngularMomentum(parameters, initial);
      const spin0 = spinAngularMomentum(parameters, initial);

      for (const state of states) {
        expect(totalEnergy(parameters, state)).toBeCloseTo(energy0, 6);
        expect(verticalAngularMomentum(parameters, state)).toBeCloseTo(vertical0, 6);
        expect(spinAngularMomentum(parameters, state)).toBeCloseTo(spin0, 8);
      }
    });

    it("bleeds energy and spin away when friction is enabled", () => {
      const parameters = baseParameters({
        tipDrag: NUTATION_TIP_DRAG_N_M_S,
        spinDrag: NUTATION_SPIN_DRAG_N_M_S,
      });
      const initial = release("cusp", parameters);
      const states = simulate(parameters, initial, 8);
      const final = states[states.length - 1];
      if (!final) {
        throw new Error("no final state");
      }

      expect(totalEnergy(parameters, final)).toBeLessThan(totalEnergy(parameters, initial));

      // ṗ_ψ = −c_s ω₃ gives exponential spin-down with time constant I₃/c_s.
      const timeConstant = NUTATION_SPIN_INERTIA_KG_M2 / NUTATION_SPIN_DRAG_N_M_S;
      expect(final.spin).toBeCloseTo(initial.spin * Math.exp(-8 / timeConstant), 4);
    });
  });

  describe("steady precession", () => {
    it("holds the tilt exactly when released at the steady rate", () => {
      const parameters = baseParameters();
      const initial = release("steady");
      const states = simulate(parameters, initial, 10);

      for (const state of states) {
        expect(state.theta).toBeCloseTo(DEFAULT_NUTATION_TILT_RAD, 6);
        expect(state.phiDot).toBeCloseTo(initial.phiDot, 6);
      }
    });

    it("precesses through the steady rate over the simulated interval", () => {
      const parameters = baseParameters();
      const initial = release("steady");
      const states = simulate(parameters, initial, 6);
      const final = states[states.length - 1];
      if (!final) {
        throw new Error("no final state");
      }

      const expected = slowPrecessionRate(parameters, DEFAULT_NUTATION_SPIN_RAD_S, DEFAULT_NUTATION_TILT_RAD);
      expect((final.phi - initial.phi) / 6).toBeCloseTo(expected, 5);
    });

    it("has no steady solution below the critical spin", () => {
      const parameters = baseParameters();
      const critical = criticalSpinRate(parameters, DEFAULT_NUTATION_TILT_RAD);
      expect(critical).toBeGreaterThan(0);

      expect(steadyPrecessionRates(parameters, critical * 0.95, DEFAULT_NUTATION_TILT_RAD).exists).toBe(false);
      expect(steadyPrecessionRates(parameters, critical * 1.05, DEFAULT_NUTATION_TILT_RAD).exists).toBe(true);
    });

    it("collapses to the gyroscopic rate Ω = Mgl/(I₃ω₃) for a fast top", () => {
      const parameters = baseParameters();
      const spin = 400;
      const roots = steadyPrecessionRates(parameters, spin, DEFAULT_NUTATION_TILT_RAD);
      const gyroscopic = gravityTorqueCoefficient(parameters) / (NUTATION_SPIN_INERTIA_KG_M2 * spin);
      expect(roots.slow / gyroscopic).toBeCloseTo(1, 2);
      expect(roots.fast).toBeGreaterThan(roots.slow * 100);
    });

    it("requires a faster spin to precess steadily nearer the vertical", () => {
      const parameters = baseParameters();
      expect(criticalSpinRate(parameters, Math.PI / 6)).toBeGreaterThan(criticalSpinRate(parameters, Math.PI / 3));
      expect(criticalSpinRate(parameters, Math.PI / 2)).toBeCloseTo(0, 6);
    });

    it("marks a vertical top as sleeping only above the stability threshold", () => {
      const parameters = baseParameters();
      const threshold = criticalSpinRate(parameters, 0);
      expect(isSleepingTopStable(parameters, threshold * 1.01)).toBe(true);
      expect(isSleepingTopStable(parameters, threshold * 0.99)).toBe(false);
    });
  });

  describe("nutation", () => {
    it("dips below the release tilt and returns to it when released from rest", () => {
      const parameters = baseParameters();
      const initial = release("cusp");
      const states = simulate(parameters, initial, 6);
      const thetas = states.map((state) => state.theta);

      expect(Math.min(...thetas)).toBeCloseTo(DEFAULT_NUTATION_TILT_RAD, 3);
      expect(Math.max(...thetas)).toBeGreaterThan(DEFAULT_NUTATION_TILT_RAD + 0.05);
    });

    it("never precesses backwards when released from rest, and pauses at each cusp", () => {
      const parameters = baseParameters();
      const states = simulate(parameters, release("cusp"), 6);
      const phiDots = states.map((state) => state.phiDot);

      expect(Math.min(...phiDots)).toBeGreaterThan(-1e-6);
      expect(Math.min(...phiDots)).toBeLessThan(1e-3);
      expect(Math.max(...phiDots)).toBeGreaterThan(0);
    });

    it("precesses backwards for part of each cycle when pushed backwards", () => {
      const parameters = baseParameters();
      const states = simulate(parameters, release("loop"), 6);
      const phiDots = states.map((state) => state.phiDot);

      expect(Math.min(...phiDots)).toBeLessThan(0);
      expect(Math.max(...phiDots)).toBeGreaterThan(0);
    });

    it("keeps precessing forwards, without cusps, when pushed forwards", () => {
      const parameters = baseParameters();
      const states = simulate(parameters, release("smooth"), 6);
      const phiDots = states.map((state) => state.phiDot);

      expect(Math.min(...phiDots)).toBeGreaterThan(0);
    });

    it("stays inside the turning points predicted by the effective potential", () => {
      const parameters = baseParameters();
      const initial = release("cusp");
      const band = nutationTurningPoints(parameters, initial);
      const states = simulate(parameters, initial, 12);

      expect(band.thetaMin).toBeCloseTo(DEFAULT_NUTATION_TILT_RAD, 4);
      expect(band.thetaMax).toBeGreaterThan(band.thetaMin);

      for (const state of states) {
        expect(state.theta).toBeGreaterThanOrEqual(band.thetaMin - 1e-4);
        expect(state.theta).toBeLessThanOrEqual(band.thetaMax + 1e-4);
      }

      // The motion must actually reach both turning points, not merely stay inside them.
      const thetas = states.map((state) => state.theta);
      expect(Math.max(...thetas)).toBeCloseTo(band.thetaMax, 3);
    });

    it("reports the same band from any point along the trajectory", () => {
      const parameters = baseParameters();
      const initial = release("loop");
      const band = nutationTurningPoints(parameters, initial);
      const states = simulate(parameters, initial, 5);

      for (const state of states) {
        const current = nutationTurningPoints(parameters, state);
        expect(current.thetaMin).toBeCloseTo(band.thetaMin, 4);
        expect(current.thetaMax).toBeCloseTo(band.thetaMax, 4);
      }
    });

    it("nutates at I₃ω₃/I₁ in the fast-top limit", () => {
      const parameters = baseParameters();
      const spin = 120;
      const initial = release("cusp", parameters, spin);
      const dt = 1 / 2000;
      const states = simulate(parameters, initial, 2, dt);

      // Time between successive cusps (θ̇ crossing zero from below) is the nutation period.
      const cuspTimes: number[] = [];
      for (let i = 1; i < states.length; i++) {
        const previous = states[i - 1];
        const current = states[i];
        if (previous && current && previous.thetaDot > 0 && current.thetaDot <= 0) {
          cuspTimes.push(i * dt);
        }
      }
      expect(cuspTimes.length).toBeGreaterThan(2);

      const first = cuspTimes[0] ?? 0;
      const last = cuspTimes[cuspTimes.length - 1] ?? 0;
      const measuredPeriod = (last - first) / (cuspTimes.length - 1);
      const predictedPeriod = (2 * Math.PI) / nutationFrequency(parameters, spin);
      expect(measuredPeriod / predictedPeriod).toBeCloseTo(1, 1);
    });

    it("nutates further when the spin is lower", () => {
      const parameters = baseParameters();
      const fast = nutationTurningPoints(parameters, release("cusp", parameters, 12));
      const slow = nutationTurningPoints(parameters, release("cusp", parameters, 6));
      expect(slow.thetaMax - slow.thetaMin).toBeGreaterThan(fast.thetaMax - fast.thetaMin);
    });
  });

  describe("friction", () => {
    it("damps the nutation band down toward steady precession", () => {
      const parameters = baseParameters({
        tipDrag: NUTATION_TIP_DRAG_N_M_S,
        spinDrag: 0,
      });
      const initial = release("cusp", parameters);
      const initialBand = nutationTurningPoints(parameters, initial);
      const states = simulate(parameters, initial, 20);
      const final = states[states.length - 1];
      if (!final) {
        throw new Error("no final state");
      }

      const finalBand = nutationTurningPoints(parameters, final);
      expect(finalBand.thetaMax - finalBand.thetaMin).toBeLessThan(
        0.25 * (initialBand.thetaMax - initialBand.thetaMin),
      );
    });

    it("drops the axis once the spin decays past the critical value", () => {
      const parameters = baseParameters({
        tipDrag: NUTATION_TIP_DRAG_N_M_S,
        spinDrag: NUTATION_SPIN_DRAG_N_M_S,
      });
      const initial = release("steady", parameters);
      const states = simulate(parameters, initial, 60);
      const final = states[states.length - 1];
      if (!final) {
        throw new Error("no final state");
      }

      expect(final.spin).toBeLessThan(criticalSpinRate(parameters, DEFAULT_NUTATION_TILT_RAD));
      expect(final.theta).toBeGreaterThan(DEFAULT_NUTATION_TILT_RAD);
    });
  });

  describe("mechanical stop", () => {
    it("rests the axle at maxTilt instead of swinging through it", () => {
      const parameters = baseParameters({
        tipDrag: NUTATION_TIP_DRAG_N_M_S,
        spinDrag: NUTATION_SPIN_DRAG_N_M_S,
        maxTilt: Math.PI / 2,
      });
      const states = simulate(parameters, release("steady", parameters), 90);

      for (const state of states) {
        expect(state.theta).toBeLessThanOrEqual(Math.PI / 2 + 1e-9);
      }
      const final = states[states.length - 1];
      if (!final) {
        throw new Error("no final state");
      }
      expect(final.theta).toBeCloseTo(Math.PI / 2, 6);
    });

    it("reports a band that stops at the mount", () => {
      const parameters = baseParameters({ maxTilt: Math.PI / 3 });
      const band = nutationTurningPoints(parameters, release("cusp", parameters, 4));
      expect(band.thetaMax).toBeCloseTo(Math.PI / 3, 9);

      // The same release without a stop nutates well past it.
      const unbounded = nutationTurningPoints(baseParameters(), release("cusp", baseParameters(), 4));
      expect(unbounded.thetaMax).toBeGreaterThan(Math.PI / 3);
    });

    it("is a stop, not a trap — an axis already rising leaves it", () => {
      const parameters = baseParameters({ maxTilt: Math.PI / 2 });
      // Gyroscopically supported at the stop, so gravity does not immediately slam it back.
      const spin = 30;
      const resting: HeavyTopState = {
        theta: Math.PI / 2,
        thetaDot: -0.5,
        phi: 0,
        phiDot: slowPrecessionRate(parameters, spin, Math.PI / 2),
        psi: 0,
        spin,
      };
      // The contact zeroes a downward θ̇ but must leave an upward one alone, so the
      // axis lifts off and nutates rather than being pinned at the stop forever.
      const thetas = simulate(parameters, resting, 0.5, 1 / 2000).map((state) => state.theta);
      expect(Math.min(...thetas)).toBeLessThan(Math.PI / 2 - 0.005);
    });
  });

  describe("stepHeavyTop", () => {
    it("returns the same state for a non-positive timestep", () => {
      const parameters = baseParameters();
      const initial = release("cusp");
      expect(stepHeavyTop(parameters, initial, 0)).toBe(initial);
      expect(stepHeavyTop(parameters, initial, -0.1)).toBe(initial);
    });

    it("agrees with itself across timestep sizes", () => {
      const parameters = baseParameters();
      const initial = release("cusp");
      const coarse = simulate(parameters, initial, 4, 1 / 30);
      const fine = simulate(parameters, initial, 4, 1 / 240);
      const coarseFinal = coarse[coarse.length - 1];
      const fineFinal = fine[fine.length - 1];
      if (!(coarseFinal && fineFinal)) {
        throw new Error("no final state");
      }

      expect(coarseFinal.theta).toBeCloseTo(fineFinal.theta, 5);
      expect(coarseFinal.phi).toBeCloseTo(fineFinal.phi, 5);
    });

    it("wraps the spin angle into [0, 2π)", () => {
      const parameters = baseParameters();
      const states = simulate(parameters, release("cusp"), 5);
      for (const state of states) {
        expect(state.psi).toBeGreaterThanOrEqual(0);
        expect(state.psi).toBeLessThan(2 * Math.PI);
      }
    });
  });
});
