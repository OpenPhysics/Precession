/**
 * NutationModel.test.ts
 */

import { describe, expect, it } from "vitest";
import { criticalSpinRate, slowPrecessionRate } from "../src/common/rigid-body/HeavySymmetricTopPhysics.js";
import { NutationModel } from "../src/nutation-screen/model/NutationModel.js";
import {
  DEFAULT_NUTATION_SPIN_RAD_S,
  DEFAULT_NUTATION_TILT_RAD,
  NUTATION_MAX_TILT_RAD,
  NUTATION_TILT_RANGE,
  NUTATION_TRACE_CAPACITY,
} from "../src/RigidBodyPrecessionConstants.js";

function run(model: NutationModel, seconds: number): void {
  const frames = Math.round(seconds * 60);
  for (let i = 0; i < frames; i++) {
    model.step(1 / 60);
  }
}

/**
 * The sleeping top. Released near the vertical, a top spun above the critical rate
 * holds itself upright and one spun below it topples all the way to the mechanical
 * stop — so `sleepingStableProperty` is a prediction the integrator either confirms
 * or refutes, and these tests are what hold the two together.
 */
describe("NutationModel — sleeping top", () => {
  function releaseNearVertical(spin: number): NutationModel {
    const model = new NutationModel();
    model.initialTiltProperty.value = NUTATION_TILT_RANGE.min;
    model.spinRateProperty.value = spin;
    return model;
  }

  it("reaches a near-vertical release tilt", () => {
    // Small enough to be an upright top, but off the Euler-angle singularity.
    expect(NUTATION_TILT_RANGE.min).toBeGreaterThan(0);
    expect(NUTATION_TILT_RANGE.min).toBeLessThan((5 * Math.PI) / 180);
  });

  it("stays upright when spun above the critical rate", () => {
    const model = releaseNearVertical(12);
    expect(model.sleepingStableProperty.value).toBe(true);

    let maxTilt = model.thetaProperty.value;
    for (let i = 0; i < 60 * 6; i++) {
      model.step(1 / 60);
      maxTilt = Math.max(maxTilt, model.thetaProperty.value);
    }

    // Never wanders more than a few degrees from where it was released.
    expect(maxTilt).toBeLessThan((10 * Math.PI) / 180);
    model.dispose();
  });

  it("topples to the mechanical stop when spun below the critical rate", () => {
    const model = releaseNearVertical(3);
    expect(model.sleepingStableProperty.value).toBe(false);

    let maxTilt = model.thetaProperty.value;
    for (let i = 0; i < 60 * 6; i++) {
      model.step(1 / 60);
      maxTilt = Math.max(maxTilt, model.thetaProperty.value);
    }

    // It falls the whole way onto the stop. (It does not *stay* there: the contact is
    // inelastic in θ̇ only, so the axis is free to swing back up off the stop.)
    expect(maxTilt).toBeCloseTo(NUTATION_MAX_TILT_RAD, 5);
    model.dispose();
  });

  it("agrees with the criticalSpinRate threshold at the vertical", () => {
    const model = new NutationModel();
    const critical = criticalSpinRate(model.getParameters(), 0);

    model.spinRateProperty.value = critical * 1.05;
    expect(model.sleepingStableProperty.value).toBe(true);

    model.spinRateProperty.value = critical * 0.95;
    expect(model.sleepingStableProperty.value).toBe(false);
    model.dispose();
  });
});

describe("NutationModel", () => {
  it("starts released at the initial tilt with the clock running", () => {
    const model = new NutationModel();
    expect(model.thetaProperty.value).toBeCloseTo(DEFAULT_NUTATION_TILT_RAD, 6);
    expect(model.thetaDotProperty.value).toBe(0);
    expect(model.spinProperty.value).toBe(DEFAULT_NUTATION_SPIN_RAD_S);
    expect(model.timer.isPlayingProperty.value).toBe(true);
    model.dispose();
  });

  it("nutates within the reported band when released from rest", () => {
    const model = new NutationModel();
    const band = model.nutationBandProperty.value;
    let lowest = model.thetaProperty.value;
    let highest = model.thetaProperty.value;

    for (let i = 0; i < 600; i++) {
      model.step(1 / 60);
      lowest = Math.min(lowest, model.thetaProperty.value);
      highest = Math.max(highest, model.thetaProperty.value);
    }

    expect(highest - lowest).toBeGreaterThan(0.05);
    expect(lowest).toBeGreaterThanOrEqual(band.thetaMin - 1e-3);
    expect(highest).toBeLessThanOrEqual(band.thetaMax + 1e-3);
    model.dispose();
  });

  it("measures a mean precession rate close to the steady rate for the cusp release", () => {
    const model = new NutationModel();
    run(model, 6);

    // Averaged over whole nutation cycles the drift matches steady precession closely.
    const steady = slowPrecessionRate(model.getParameters(), DEFAULT_NUTATION_SPIN_RAD_S, DEFAULT_NUTATION_TILT_RAD);
    expect(model.meanPrecessionRateProperty.value).toBeGreaterThan(0);
    expect(model.meanPrecessionRateProperty.value / steady).toBeGreaterThan(0.5);
    expect(model.meanPrecessionRateProperty.value / steady).toBeLessThan(1.6);
    model.dispose();
  });

  it("holds the tilt with no nutation in steady release mode", () => {
    const model = new NutationModel();
    model.releaseModeProperty.value = "steady";
    run(model, 8);

    const band = model.nutationBandProperty.value;
    expect(model.thetaProperty.value).toBeCloseTo(DEFAULT_NUTATION_TILT_RAD, 4);
    expect(band.thetaMax - band.thetaMin).toBeLessThan(1e-3);
    model.dispose();
  });

  it("re-releases the top when a launch parameter changes", () => {
    const model = new NutationModel();
    run(model, 3);
    expect(model.timer.timeProperty.value).toBeGreaterThan(0);
    expect(model.getTraceSamples().length).toBeGreaterThan(0);

    model.spinRateProperty.value = 10;

    expect(model.timer.timeProperty.value).toBe(0);
    expect(model.getTraceSamples().length).toBe(0);
    expect(model.thetaProperty.value).toBeCloseTo(DEFAULT_NUTATION_TILT_RAD, 6);
    expect(model.spinProperty.value).toBe(10);
    model.dispose();
  });

  it("keeps the trace bounded by its capacity", () => {
    const model = new NutationModel();
    run(model, 30);
    expect(model.getTraceSamples().length).toBe(NUTATION_TRACE_CAPACITY);
    expect(model.getThetaGraphPoints().length).toBe(NUTATION_TRACE_CAPACITY);
    model.dispose();
  });

  it("does not advance while paused, but steps forward on demand", () => {
    const model = new NutationModel();
    model.timer.isPlayingProperty.value = false;
    const theta = model.thetaProperty.value;

    run(model, 2);
    expect(model.thetaProperty.value).toBe(theta);
    expect(model.timer.timeProperty.value).toBe(0);

    for (let i = 0; i < 60; i++) {
      model.stepOnce(1 / 60);
    }
    expect(model.thetaProperty.value).not.toBe(theta);
    expect(model.timer.timeProperty.value).toBeCloseTo(1, 6);
    model.dispose();
  });

  it("spins the top down and drops it when friction is enabled", () => {
    const model = new NutationModel();
    model.releaseModeProperty.value = "steady";
    model.frictionEnabledProperty.value = true;
    run(model, 60);

    // Steady precession at the release tilt is no longer possible, so the axis falls.
    expect(model.spinProperty.value).toBeLessThan(criticalSpinRate(model.getParameters(), DEFAULT_NUTATION_TILT_RAD));
    expect(model.thetaProperty.value).toBeGreaterThan(DEFAULT_NUTATION_TILT_RAD);
    model.dispose();
  });

  it("reset restores the launch parameters and clears the history", () => {
    const model = new NutationModel();
    model.releaseModeProperty.value = "loop";
    model.frictionEnabledProperty.value = true;
    model.spinRateProperty.value = 12;
    run(model, 4);

    model.reset();

    expect(model.spinRateProperty.value).toBe(DEFAULT_NUTATION_SPIN_RAD_S);
    expect(model.initialTiltProperty.value).toBeCloseTo(DEFAULT_NUTATION_TILT_RAD, 12);
    expect(model.releaseModeProperty.value).toBe("cusp");
    expect(model.frictionEnabledProperty.value).toBe(false);
    expect(model.timer.timeProperty.value).toBe(0);
    expect(model.getTraceSamples().length).toBe(0);
    expect(model.thetaProperty.value).toBeCloseTo(DEFAULT_NUTATION_TILT_RAD, 6);
    model.dispose();
  });
});
