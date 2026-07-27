/**
 * SteadyPrecessionModel.test.ts
 */

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
