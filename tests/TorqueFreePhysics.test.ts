/**
 * TorqueFreePhysics.test.ts
 *
 * The screen's whole claim is that a free block flips about its intermediate axis
 * *without anything acting on it*. That is only believable if the invariants really
 * are invariant, so these assert them to many decimals across a run that includes
 * several flips — and then assert that the flips actually happen.
 */

import { Vector3 } from "scenerystack/dot";
import { describe, expect, it } from "vitest";
import {
  angularMomentumMagnitude,
  boxInertia,
  IDENTITY_ROTATION,
  instabilityGrowthRate,
  intermediateAxis,
  isAxisStable,
  kineticEnergy,
  rotateToWorld,
  stepTorqueFree,
  type TorqueFreeState,
} from "../src/common/rigid-body/TorqueFreePhysics.js";
import { TUMBLE_BOX_MASS_KG, TUMBLE_BOX_SIZE_M } from "../src/RigidBodyPrecessionConstants.js";

const INERTIA = boxInertia(TUMBLE_BOX_MASS_KG, TUMBLE_BOX_SIZE_M.x, TUMBLE_BOX_SIZE_M.y, TUMBLE_BOX_SIZE_M.z);

function run(omega0: Vector3, duration: number, dt = 1 / 60): TorqueFreeState[] {
  let state: TorqueFreeState = { omega: omega0, orientation: IDENTITY_ROTATION };
  const history: TorqueFreeState[] = [state];
  const steps = Math.round(duration / dt);
  for (let i = 0; i < steps; i++) {
    state = stepTorqueFree(INERTIA, state, dt);
    history.push(state);
  }
  return history;
}

describe("TorqueFreePhysics", () => {
  it("orders the block's principal moments I₁ > I₂ > I₃", () => {
    expect(INERTIA.i1).toBeGreaterThan(INERTIA.i2);
    expect(INERTIA.i2).toBeGreaterThan(INERTIA.i3);
  });

  it("calls only the intermediate axis unstable", () => {
    expect(isAxisStable(INERTIA, 0)).toBe(true);
    expect(isAxisStable(INERTIA, 1)).toBe(false);
    expect(isAxisStable(INERTIA, 2)).toBe(true);
    expect(intermediateAxis(INERTIA)).toBe(1);
  });

  it("reports a growth rate only for the unstable axis, proportional to the spin", () => {
    expect(instabilityGrowthRate(INERTIA, 0, 6)).toBe(0);
    expect(instabilityGrowthRate(INERTIA, 2, 6)).toBe(0);
    const slow = instabilityGrowthRate(INERTIA, 1, 3);
    const fast = instabilityGrowthRate(INERTIA, 1, 6);
    expect(slow).toBeGreaterThan(0);
    expect(fast / slow).toBeCloseTo(2, 6);
  });

  it("conserves energy and |L| through many flips", () => {
    const omega0 = new Vector3(0.24, 6, 0.24);
    const history = run(omega0, 20);

    const energy0 = kineticEnergy(INERTIA, omega0);
    const momentum0 = angularMomentumMagnitude(INERTIA, omega0);

    for (const state of history) {
      expect(kineticEnergy(INERTIA, state.omega)).toBeCloseTo(energy0, 8);
      expect(angularMomentumMagnitude(INERTIA, state.omega)).toBeCloseTo(momentum0, 8);
    }
  });

  it("keeps the angular momentum fixed in space, not just in size", () => {
    const omega0 = new Vector3(0.24, 6, 0.24);
    let state: TorqueFreeState = { omega: omega0, orientation: IDENTITY_ROTATION };

    const worldMomentum = (s: TorqueFreeState): Vector3 =>
      rotateToWorld(s.orientation, new Vector3(INERTIA.i1 * s.omega.x, INERTIA.i2 * s.omega.y, INERTIA.i3 * s.omega.z));

    const initial = worldMomentum(state);
    for (let i = 0; i < 60 * 12; i++) {
      state = stepTorqueFree(INERTIA, state, 1 / 60);
      const current = worldMomentum(state);
      expect(current.x).toBeCloseTo(initial.x, 5);
      expect(current.y).toBeCloseTo(initial.y, 5);
      expect(current.z).toBeCloseTo(initial.z, 5);
    }
  });

  it("flips repeatedly about the intermediate axis", () => {
    const history = run(new Vector3(0.24, 6, 0.24), 30);
    let signChanges = 0;
    for (let i = 1; i < history.length; i++) {
      const previous = (history[i - 1] as TorqueFreeState).omega.y;
      const current = (history[i] as TorqueFreeState).omega.y;
      if (previous > 0 !== current > 0) {
        signChanges++;
      }
    }
    expect(signChanges).toBeGreaterThanOrEqual(4);
  });

  it("holds a spin about the largest-inertia axis steady", () => {
    const history = run(new Vector3(6, 0.24, 0.24), 30);
    for (const state of history) {
      // ω₁ never reverses and the transverse components stay small.
      expect(state.omega.x).toBeGreaterThan(5);
      expect(Math.abs(state.omega.y)).toBeLessThan(1);
      expect(Math.abs(state.omega.z)).toBeLessThan(1);
    }
  });

  it("holds a spin about the smallest-inertia axis steady", () => {
    const history = run(new Vector3(0.24, 0.24, 6), 30);
    for (const state of history) {
      expect(state.omega.z).toBeGreaterThan(5);
      expect(Math.abs(state.omega.x)).toBeLessThan(1);
      expect(Math.abs(state.omega.y)).toBeLessThan(1);
    }
  });

  it("keeps the orientation quaternion normalized", () => {
    const history = run(new Vector3(0.24, 6, 0.24), 20);
    for (const state of history) {
      const q = state.orientation;
      expect(Math.sqrt(q.x ** 2 + q.y ** 2 + q.z ** 2 + q.w ** 2)).toBeCloseTo(1, 10);
    }
  });

  it("rotates body vectors into world coordinates without changing their length", () => {
    const history = run(new Vector3(0.24, 6, 0.24), 5);
    const body = new Vector3(0.3, -0.2, 0.7);
    for (const state of history) {
      expect(rotateToWorld(state.orientation, body).magnitude).toBeCloseTo(body.magnitude, 9);
    }
  });
});
