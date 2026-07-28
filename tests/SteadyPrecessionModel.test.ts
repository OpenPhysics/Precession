/**
 * SteadyPrecessionModel.test.ts
 */

import { TimeSpeed } from "scenerystack/scenery-phet";
import { describe, expect, it } from "vitest";
import { predictedPrecessionRate } from "../src/common/rigid-body/SteadyPrecessionPhysics.js";
import { SteadyPrecessionModel } from "../src/steady-precession-screen/model/SteadyPrecessionModel.js";

describe("SteadyPrecessionModel", () => {
  it("starts with zero precession when pivot is at center of mass", () => {
    const model = new SteadyPrecessionModel();
    model.pivotAtCenterOfMassProperty.value = true;
    for (let i = 0; i < 120; i++) {
      model.step(1 / 60);
    }
    expect(model.predictedPrecessionRateProperty.value).toBe(0);
    expect(model.precessionAngleProperty.value).toBeCloseTo(0, 3);
    model.dispose();
  });

  it("records graph samples while running", () => {
    const model = new SteadyPrecessionModel();
    for (let i = 0; i < 180; i++) {
      model.step(1 / 30);
    }
    expect(model.getGraphPoints().length).toBeGreaterThan(10);
    model.dispose();
  });

  it("matches predicted and measured precession after spin-up", () => {
    const model = new SteadyPrecessionModel();
    for (let i = 0; i < 600; i++) {
      model.step(1 / 60);
    }
    const predicted = predictedPrecessionRate(model.getParameters());
    const measured = model.measuredPrecessionRateProperty.value;
    expect(predicted).toBeGreaterThan(0);
    expect(measured).toBeGreaterThan(0);
    expect(measured).toBeCloseTo(predicted, 1);
    model.dispose();
  });

  it("holds the gyroscope still while paused", () => {
    const model = new SteadyPrecessionModel();
    for (let i = 0; i < 60; i++) {
      model.step(1 / 60);
    }

    model.timer.isPlayingProperty.value = false;
    const time = model.timer.timeProperty.value;
    const precessionAngle = model.precessionAngleProperty.value;
    const spinAngle = model.spinAngleProperty.value;
    const samples = model.getGraphPoints().length;

    for (let i = 0; i < 120; i++) {
      model.step(1 / 60);
    }

    expect(model.timer.timeProperty.value).toBe(time);
    expect(model.precessionAngleProperty.value).toBe(precessionAngle);
    expect(model.spinAngleProperty.value).toBe(spinAngle);
    expect(model.getGraphPoints().length).toBe(samples);
    model.dispose();
  });

  it("stepOnce advances both the motion and the clock while paused", () => {
    const model = new SteadyPrecessionModel();
    model.timer.isPlayingProperty.value = false;
    const precessionAngle = model.precessionAngleProperty.value;

    model.stepOnce(1 / 60);

    expect(model.timer.timeProperty.value).toBeCloseTo(1 / 60, 9);
    expect(model.precessionAngleProperty.value).toBeGreaterThan(precessionAngle);
    model.dispose();
  });

  it("slow motion advances the clock at a quarter of real time", () => {
    const normal = new SteadyPrecessionModel();
    const slow = new SteadyPrecessionModel();
    slow.timeSpeedProperty.value = TimeSpeed.SLOW;

    for (let i = 0; i < 60; i++) {
      normal.step(1 / 60);
      slow.step(1 / 60);
    }

    expect(normal.timer.timeProperty.value).toBeCloseTo(1, 6);
    expect(slow.timer.timeProperty.value).toBeCloseTo(0.25, 6);
    // Quarter of the elapsed time means a quarter of the precession, not a slower Ω.
    expect(slow.precessionAngleProperty.value).toBeLessThan(normal.precessionAngleProperty.value);
    normal.dispose();
    slow.dispose();
  });

  it("reset restores initial state", () => {
    const model = new SteadyPrecessionModel();
    for (let i = 0; i < 120; i++) {
      model.step(1 / 60);
    }
    model.reset();
    expect(model.timer.timeProperty.value).toBe(0);
    expect(model.precessionAngleProperty.value).toBe(0);
    expect(model.getGraphPoints().length).toBe(0);
    model.dispose();
  });
});
