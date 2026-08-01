/**
 * TorqueFreeModel.ts
 *
 * Model for Screen 3 — a rigid block tumbling with no torque on it.
 *
 * Screens 1 and 2 are both about what gravity does to a *symmetric* top. This screen
 * removes gravity entirely and breaks the symmetry instead, which turns out to be
 * quite enough on its own: spun about its intermediate axis, a block with three
 * different moments of inertia flips over, and keeps flipping, forever, with its
 * energy and its angular momentum both exactly conserved. Nothing pushes it.
 *
 * The launch axis is an initial condition, so choosing a different one re-launches
 * the block rather than steering the one already tumbling.
 */

import {
  BooleanProperty,
  DerivedProperty,
  EnumerationProperty,
  NumberProperty,
  Property,
  StringUnionProperty,
} from "scenerystack/axon";
import { Vector3 } from "scenerystack/dot";
import type { TModel } from "scenerystack/joist";
import { TimeSpeed } from "scenerystack/scenery-phet";
import { FlipTracker } from "../../common/rigid-body/FlipTracker.js";
import {
  angularMomentumMagnitude,
  axisMomentumAlignment,
  bodyAngularMomentum,
  boxInertia,
  IDENTITY_ROTATION,
  instabilityGrowthRate,
  isAxisStable,
  kineticEnergy,
  type Rotation,
  rotateToWorld,
  stepTorqueFree,
  type TorqueFreeState,
} from "../../common/rigid-body/TorqueFreePhysics.js";
import { TimeModel } from "../../common/TimeModel.js";
import {
  DEFAULT_TUMBLE_SPIN_RAD_S,
  TUMBLE_BOX_MASS_KG,
  TUMBLE_BOX_SIZE_M,
  TUMBLE_HISTORY_CAPACITY,
  TUMBLE_NUDGE_FRACTION,
  TUMBLE_SAMPLE_INTERVAL_S,
} from "../../RigidBodyPrecessionConstants.js";

/**
 * Which principal axis the block is set spinning about, named by its moment of
 * inertia rather than by a body-axis letter — the moment is what decides stability.
 *
 * The block's sides run a < b < c along body x, y, z, so I₁ > I₂ > I₃: body x, normal
 * to the largest face, carries the largest moment; body z, the long axis, the
 * smallest; and body y is the intermediate one that will not hold still.
 */
export type SpinAxis = "maxInertia" | "intermediate" | "minInertia";

const AXIS_VECTORS: Record<SpinAxis, Vector3> = {
  maxInertia: new Vector3(1, 0, 0),
  intermediate: new Vector3(0, 1, 0),
  minInertia: new Vector3(0, 0, 1),
};

const AXIS_INDEX: Record<SpinAxis, 0 | 1 | 2> = { maxInertia: 0, intermediate: 1, minInertia: 2 };

/** Slow motion factor, so a fast flip can be followed frame by frame. */
const SLOW_MOTION_FACTOR = 0.25;

export type OmegaSample = { readonly t: number; readonly x: number; readonly y: number; readonly z: number };

export class TorqueFreeModel implements TModel {
  public readonly timer = new TimeModel(true);
  public readonly timeSpeedProperty = new EnumerationProperty(TimeSpeed.NORMAL);

  // ── Launch parameters ───────────────────────────────────────────────────────

  /** Which principal axis the block is spun about at launch. */
  public readonly spinAxisProperty = new StringUnionProperty<SpinAxis>("intermediate", {
    validValues: ["maxInertia", "intermediate", "minInertia"],
  });
  /** Spin rate at launch (rad/s). */
  public readonly spinRateProperty = new NumberProperty(DEFAULT_TUMBLE_SPIN_RAD_S);
  /**
   * Whether to add a small transverse wobble at launch. Perfect rotation about the
   * intermediate axis is an exact — but unstable — solution, so with no nudge at all
   * the block would sit there spinning and the instability would never show. Real
   * throws always contain a nudge; this makes that explicit rather than relying on
   * round-off to supply one.
   */
  public readonly nudgeEnabledProperty = new BooleanProperty(true);

  // ── Dynamical state ─────────────────────────────────────────────────────────

  /** Angular velocity in the body frame (rad/s). */
  public readonly omegaProperty = new Property<Vector3>(Vector3.ZERO);
  /** Orientation of the body relative to the world. */
  public readonly orientationProperty = new Property<Rotation>(IDENTITY_ROTATION);

  // ── Derived readouts ────────────────────────────────────────────────────────

  /** Rotational kinetic energy (J) — exactly conserved. */
  public readonly energyProperty;
  /** |L| (kg·m²/s) — exactly conserved, and fixed in direction too. */
  public readonly momentumProperty;
  /** Whether the chosen launch axis is a stable one. */
  public readonly axisStableProperty;
  /** e-folding rate of a disturbance about the launch axis (1/s); 0 when stable. */
  public readonly growthRateProperty;
  /**
   * Flips counted since launch. The stability readout is a prediction; this is the
   * measurement that confirms it, and it stays at 0 forever about a stable axis.
   */
  public readonly flipCountProperty = new NumberProperty(0);
  /** Mean seconds between flips (0 until two have been counted). */
  public readonly flipPeriodProperty = new NumberProperty(0);

  public readonly inertia = boxInertia(
    TUMBLE_BOX_MASS_KG,
    TUMBLE_BOX_SIZE_M.x,
    TUMBLE_BOX_SIZE_M.y,
    TUMBLE_BOX_SIZE_M.z,
  );

  private history: OmegaSample[] = [];
  private sampleAccumulator = 0;
  private readonly flipTracker = new FlipTracker();

  public constructor() {
    this.energyProperty = new DerivedProperty([this.omegaProperty], (omega) => kineticEnergy(this.inertia, omega));
    this.momentumProperty = new DerivedProperty([this.omegaProperty], (omega) =>
      angularMomentumMagnitude(this.inertia, omega),
    );
    this.axisStableProperty = new DerivedProperty([this.spinAxisProperty], (axis) =>
      isAxisStable(this.inertia, AXIS_INDEX[axis]),
    );
    this.growthRateProperty = new DerivedProperty([this.spinAxisProperty, this.spinRateProperty], (axis, rate) =>
      instabilityGrowthRate(this.inertia, AXIS_INDEX[axis], rate),
    );

    this.spinAxisProperty.lazyLink(() => this.launch());
    this.spinRateProperty.lazyLink(() => this.launch());
    this.nudgeEnabledProperty.lazyLink(() => this.launch());

    this.launch();
  }

  public getState(): TorqueFreeState {
    return { omega: this.omegaProperty.value, orientation: this.orientationProperty.value };
  }

  /** Angular momentum in *world* coordinates — the arrow that never moves. */
  public getWorldAngularMomentum(): Vector3 {
    return rotateToWorld(this.orientationProperty.value, bodyAngularMomentum(this.inertia, this.omegaProperty.value));
  }

  /** Angular velocity in world coordinates — the arrow that does move. */
  public getWorldOmega(): Vector3 {
    return rotateToWorld(this.orientationProperty.value, this.omegaProperty.value);
  }

  public getHistory(): readonly OmegaSample[] {
    return this.history;
  }

  /**
   * The launch axis's share of the angular momentum, +1 at launch and −1 once the
   * block has turned over. This is what the flip counter watches.
   */
  public getLaunchAxisAlignment(): number {
    return axisMomentumAlignment(this.inertia, this.omegaProperty.value, AXIS_INDEX[this.spinAxisProperty.value]);
  }

  /** Re-launch from the current parameters and clear the history. */
  public launch(): void {
    const rate = this.spinRateProperty.value;
    const axis = AXIS_VECTORS[this.spinAxisProperty.value];
    let omega = axis.timesScalar(rate);

    if (this.nudgeEnabledProperty.value) {
      // A small component along each of the other two axes. Deterministic, so the
      // same settings always produce the same tumble.
      const nudge = rate * TUMBLE_NUDGE_FRACTION;
      omega = omega.plus(
        new Vector3(axis.x === 1 ? 0 : nudge, axis.y === 1 ? 0 : nudge * 0.6, axis.z === 1 ? 0 : nudge),
      );
    }

    this.omegaProperty.value = omega;
    this.orientationProperty.value = IDENTITY_ROTATION;
    this.history = [];
    this.sampleAccumulator = 0;
    this.timer.timeProperty.value = 0;

    this.flipTracker.reset();
    this.flipCountProperty.value = 0;
    this.flipPeriodProperty.value = 0;
    // Seed the tracker with the launch alignment, so the very first reversal counts.
    this.flipTracker.update(0, this.getLaunchAxisAlignment());
  }

  public step(dt: number): void {
    if (!this.timer.isPlayingProperty.value) {
      return;
    }
    this.stepOnce(this.timeSpeedProperty.value === TimeSpeed.SLOW ? dt * SLOW_MOTION_FACTOR : dt);
  }

  /** Advance by dt regardless of the play/pause state (used by step-forward). */
  public stepOnce(dt: number): void {
    this.timer.timeProperty.value += dt;
    const next = stepTorqueFree(this.inertia, this.getState(), dt);
    this.orientationProperty.value = next.orientation;

    this.sampleAccumulator += dt;
    if (this.sampleAccumulator >= TUMBLE_SAMPLE_INTERVAL_S) {
      this.history.push({
        t: this.timer.timeProperty.value,
        x: next.omega.x,
        y: next.omega.y,
        z: next.omega.z,
      });
      if (this.history.length > TUMBLE_HISTORY_CAPACITY) {
        this.history.shift();
      }
      this.sampleAccumulator = 0;
    }

    // Set ω last: the readouts derive from it and read the history.
    this.omegaProperty.value = next.omega;

    if (this.flipTracker.update(this.timer.timeProperty.value, this.getLaunchAxisAlignment())) {
      const statistics = this.flipTracker.getStatistics();
      this.flipCountProperty.value = statistics.count;
      this.flipPeriodProperty.value = statistics.meanInterval;
    }
  }

  public reset(): void {
    this.timer.reset();
    this.timeSpeedProperty.reset();
    this.spinAxisProperty.reset();
    this.spinRateProperty.reset();
    this.nudgeEnabledProperty.reset();
    this.launch();
  }

  public dispose(): void {
    this.timer.dispose();
    this.timeSpeedProperty.dispose();
    this.spinAxisProperty.dispose();
    this.spinRateProperty.dispose();
    this.nudgeEnabledProperty.dispose();
    this.flipCountProperty.dispose();
    this.flipPeriodProperty.dispose();
    this.omegaProperty.dispose();
    this.orientationProperty.dispose();
    this.energyProperty.dispose();
    this.momentumProperty.dispose();
    this.axisStableProperty.dispose();
    this.growthRateProperty.dispose();
  }
}
