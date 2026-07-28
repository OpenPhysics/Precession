/**
 * TorqueFreeModel.test.ts
 *
 * Screen 3's model wiring: the launch, the play/pause gate, and the flip counter
 * that turns the tennis-racket theorem into a measurement. The stability readout is
 * a prediction made from the inertia tensor alone; these tests check the integrated
 * motion actually agrees with it.
 */

import { TimeSpeed } from "scenerystack/scenery-phet";
import { describe, expect, it } from "vitest";
import { TorqueFreeModel } from "../src/torque-free-screen/model/TorqueFreeModel.js";

/** Advance the model by `seconds` at 60 Hz. */
function run(model: TorqueFreeModel, seconds: number): void {
  for (let i = 0; i < Math.round(seconds * 60); i++) {
    model.stepOnce(1 / 60);
  }
}

describe("TorqueFreeModel", () => {
  it("counts flips about the intermediate axis and times them", () => {
    const model = new TorqueFreeModel();
    model.spinAxisProperty.value = "intermediate";
    run(model, 20);

    expect(model.axisStableProperty.value).toBe(false);
    expect(model.flipCountProperty.value).toBeGreaterThan(1);
    // A flip period of order seconds — not milliseconds (chatter) and not the whole run.
    expect(model.flipPeriodProperty.value).toBeGreaterThan(0.5);
    expect(model.flipPeriodProperty.value).toBeLessThan(10);
    model.dispose();
  });

  it("counts no flips about either stable axis", () => {
    for (const axis of ["maxInertia", "minInertia"] as const) {
      const model = new TorqueFreeModel();
      model.spinAxisProperty.value = axis;
      run(model, 20);

      expect(model.axisStableProperty.value).toBe(true);
      expect(model.flipCountProperty.value).toBe(0);
      expect(model.flipPeriodProperty.value).toBe(0);
      // The launch axis keeps essentially all of L: that is what "stable" means here.
      expect(model.getLaunchAxisAlignment()).toBeGreaterThan(0.9);
      model.dispose();
    }
  });

  it("starts every launch fully aligned with the launch axis", () => {
    const model = new TorqueFreeModel();
    model.spinAxisProperty.value = "intermediate";
    expect(model.getLaunchAxisAlignment()).toBeGreaterThan(0.9);
    model.dispose();
  });

  it("flips faster when spun faster, since the growth rate scales with the spin", () => {
    const slow = new TorqueFreeModel();
    slow.spinAxisProperty.value = "intermediate";
    slow.spinRateProperty.value = 4;
    run(slow, 30);

    const fast = new TorqueFreeModel();
    fast.spinAxisProperty.value = "intermediate";
    fast.spinRateProperty.value = 10;
    run(fast, 30);

    expect(fast.flipCountProperty.value).toBeGreaterThan(slow.flipCountProperty.value);
    expect(fast.flipPeriodProperty.value).toBeLessThan(slow.flipPeriodProperty.value);
    slow.dispose();
    fast.dispose();
  });

  it("relaunching clears the flip count", () => {
    const model = new TorqueFreeModel();
    model.spinAxisProperty.value = "intermediate";
    run(model, 20);
    expect(model.flipCountProperty.value).toBeGreaterThan(0);

    model.launch();
    expect(model.flipCountProperty.value).toBe(0);
    expect(model.flipPeriodProperty.value).toBe(0);
    expect(model.timer.timeProperty.value).toBe(0);
    model.dispose();
  });

  it("step does nothing while paused, but stepOnce still advances", () => {
    const model = new TorqueFreeModel();
    model.timer.isPlayingProperty.value = false;

    const omega = model.omegaProperty.value;
    model.step(1 / 60);
    expect(model.timer.timeProperty.value).toBe(0);
    expect(model.omegaProperty.value).toBe(omega);

    model.stepOnce(1 / 60);
    expect(model.timer.timeProperty.value).toBeCloseTo(1 / 60, 9);
    model.dispose();
  });

  it("slow motion advances the clock at a quarter of real time", () => {
    const normal = new TorqueFreeModel();
    const slow = new TorqueFreeModel();
    slow.timeSpeedProperty.value = TimeSpeed.SLOW;

    for (let i = 0; i < 60; i++) {
      normal.step(1 / 60);
      slow.step(1 / 60);
    }

    expect(normal.timer.timeProperty.value).toBeCloseTo(1, 6);
    expect(slow.timer.timeProperty.value).toBeCloseTo(0.25, 6);
    normal.dispose();
    slow.dispose();
  });

  it("conserves T and |L| through a run containing flips", () => {
    const model = new TorqueFreeModel();
    model.spinAxisProperty.value = "intermediate";
    const energy0 = model.energyProperty.value;
    const momentum0 = model.momentumProperty.value;

    run(model, 20);

    expect(model.flipCountProperty.value).toBeGreaterThan(0);
    expect(model.energyProperty.value).toBeCloseTo(energy0, 8);
    expect(model.momentumProperty.value).toBeCloseTo(momentum0, 8);
    model.dispose();
  });
});
