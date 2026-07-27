/**
 * SteadyPrecessionModel.ts
 *
 * Model for Screen 1 — steady precession of a symmetric gyroscope under gravity.
 */

import { BooleanProperty, DerivedProperty, NumberProperty } from "scenerystack/axon";
import { toFixed } from "scenerystack/dot";
import type { TModel } from "scenerystack/joist";
import { PrecessionDataSeries } from "../../common/rigid-body/PrecessionDataSeries.js";
import {
  predictedPrecessionRate,
  type SteadyPrecessionParameters,
  steadyPrecessionVectors,
  stepSteadyPrecession,
  torqueMagnitude,
} from "../../common/rigid-body/SteadyPrecessionPhysics.js";
import { TimeModel } from "../../common/TimeModel.js";
import {
  DEFAULT_ARM_MASS_KG,
  DEFAULT_PIVOT_TO_MASS_DISTANCE_M,
  DEFAULT_SPIN_RATE_RAD_S,
  DEFAULT_TILT_ANGLE_RAD,
  DISK_INERTIA_KG_M2,
  DISK_MASS_KG,
  DISK_POSITION_FROM_PIVOT_M,
  GRAVITY_MPS2,
  PRECESSION_GRAPH_CAPACITY,
  SPIN_UP_TIME_CONSTANT_S,
} from "../../RigidBodyPrecessionConstants.js";

export class SteadyPrecessionModel implements TModel {
  public readonly timer = new TimeModel(true);

  public readonly spinRateProperty = new NumberProperty(DEFAULT_SPIN_RATE_RAD_S);
  public readonly armMassProperty = new NumberProperty(DEFAULT_ARM_MASS_KG, { units: "kg" });
  public readonly pivotToMassDistanceProperty = new NumberProperty(DEFAULT_PIVOT_TO_MASS_DISTANCE_M, {
    units: "m",
  });
  public readonly pivotAtCenterOfMassProperty = new BooleanProperty(false);

  public readonly precessionAngleProperty = new NumberProperty(0);
  public readonly spinAngleProperty = new NumberProperty(0);
  /** Starts at the target so φ(t) is linear from t=0; still lags when the slider moves. */
  public readonly actualSpinRateProperty = new NumberProperty(DEFAULT_SPIN_RATE_RAD_S);

  public readonly predictedPrecessionRateProperty;
  public readonly measuredPrecessionRateProperty;
  public readonly torqueReadoutProperty;
  public readonly precessionComparisonProperty;

  private readonly dataSeries = new PrecessionDataSeries(PRECESSION_GRAPH_CAPACITY);
  private sampleAccumulator = 0;

  public constructor() {
    this.predictedPrecessionRateProperty = new DerivedProperty(
      [
        this.spinRateProperty,
        this.armMassProperty,
        this.pivotToMassDistanceProperty,
        this.pivotAtCenterOfMassProperty,
        this.actualSpinRateProperty,
      ],
      () => predictedPrecessionRate(this.getParameters()),
    );

    this.measuredPrecessionRateProperty = new DerivedProperty([this.precessionAngleProperty], () =>
      this.dataSeries.estimateSlope(),
    );

    this.torqueReadoutProperty = new DerivedProperty(
      [
        this.armMassProperty,
        this.pivotToMassDistanceProperty,
        this.pivotAtCenterOfMassProperty,
        this.actualSpinRateProperty,
      ],
      () => {
        const tau = torqueMagnitude(this.getParameters());
        return `τ = ${toFixed(tau, 3)} N·m`;
      },
    );

    this.precessionComparisonProperty = new DerivedProperty(
      [this.predictedPrecessionRateProperty, this.measuredPrecessionRateProperty],
      (predicted, measured) => {
        const predictedHz = predicted / (2 * Math.PI);
        const measuredHz = measured / (2 * Math.PI);
        return `Ω_pred = ${toFixed(predictedHz, 3)} Hz · Ω_meas = ${toFixed(measuredHz, 3)} Hz`;
      },
    );
  }

  public getParameters(): SteadyPrecessionParameters {
    return {
      spinRateTarget: this.spinRateProperty.value,
      spinRate: this.actualSpinRateProperty.value,
      armMass: this.armMassProperty.value,
      pivotToMassDistance: this.pivotToMassDistanceProperty.value,
      pivotAtCenterOfMass: this.pivotAtCenterOfMassProperty.value,
      tiltAngle: DEFAULT_TILT_ANGLE_RAD,
      diskMass: DISK_MASS_KG,
      diskInertia: DISK_INERTIA_KG_M2,
      diskPositionFromPivot: DISK_POSITION_FROM_PIVOT_M,
      gravity: GRAVITY_MPS2,
    };
  }

  public getVectors() {
    return steadyPrecessionVectors(this.getParameters());
  }

  public getGraphPoints(): Array<{ x: number; y: number }> {
    return this.dataSeries.toPlotPoints();
  }

  public step(dt: number): void {
    this.timer.step(dt);
    const next = stepSteadyPrecession(
      this.getParameters(),
      {
        precessionAngle: this.precessionAngleProperty.value,
        spinAngle: this.spinAngleProperty.value,
        spinRate: this.actualSpinRateProperty.value,
      },
      dt,
      SPIN_UP_TIME_CONSTANT_S,
    );

    this.precessionAngleProperty.value = next.precessionAngle;
    this.spinAngleProperty.value = next.spinAngle;
    this.actualSpinRateProperty.value = next.spinRate;

    this.sampleAccumulator += dt;
    if (this.sampleAccumulator >= 1 / 30) {
      this.dataSeries.push(this.timer.timeProperty.value, this.precessionAngleProperty.value);
      this.sampleAccumulator = 0;
    }
  }

  public reset(): void {
    this.timer.reset();
    this.spinRateProperty.reset();
    this.armMassProperty.reset();
    this.pivotToMassDistanceProperty.reset();
    this.pivotAtCenterOfMassProperty.reset();
    this.precessionAngleProperty.reset();
    this.spinAngleProperty.reset();
    this.actualSpinRateProperty.reset();
    this.dataSeries.clear();
    this.sampleAccumulator = 0;
  }

  public dispose(): void {
    this.timer.dispose();
    this.spinRateProperty.dispose();
    this.armMassProperty.dispose();
    this.pivotToMassDistanceProperty.dispose();
    this.pivotAtCenterOfMassProperty.dispose();
    this.precessionAngleProperty.dispose();
    this.spinAngleProperty.dispose();
    this.actualSpinRateProperty.dispose();
    this.predictedPrecessionRateProperty.dispose();
    this.measuredPrecessionRateProperty.dispose();
    this.torqueReadoutProperty.dispose();
    this.precessionComparisonProperty.dispose();
  }
}
