/**
 * NutationModel.ts
 *
 * Model for Screen 2 — a heavy symmetric top integrated from its full Lagrangian
 * equations of motion, instead of Screen 1's idealized steady-precession formula.
 *
 * The tilt θ is a genuine dynamical variable here, so releasing the top produces
 * nutation: the axis dips, gains precession, rises, and repeats. Changing any
 * launch parameter (spin, tilt, release mode) re-releases the top, since those are
 * initial conditions rather than continuously variable properties of the motion.
 */

import { BooleanProperty, DerivedProperty, EnumerationProperty, NumberProperty, Property } from "scenerystack/axon";
import type { TModel } from "scenerystack/joist";
import { TimeSpeed } from "scenerystack/scenery-phet";
import {
  createReleaseState,
  criticalSpinRate,
  type HeavyTopParameters,
  type HeavyTopState,
  isSleepingTopStable,
  type NutationBand,
  nutationFrequency,
  nutationTurningPoints,
  type ReleaseMode,
  slowPrecessionRate,
  steadyPrecessionRates,
  stepHeavyTop,
  totalEnergy,
  verticalAngularMomentum,
} from "../../common/rigid-body/HeavySymmetricTopPhysics.js";
import { TopTipTrace } from "../../common/rigid-body/TopTipTrace.js";
import { TimeModel } from "../../common/TimeModel.js";
import {
  DEFAULT_NUTATION_SPIN_RAD_S,
  DEFAULT_NUTATION_TILT_RAD,
  GRAVITY_MPS2,
  NUTATION_COM_DISTANCE_M,
  NUTATION_MAX_TILT_RAD,
  NUTATION_SAMPLE_INTERVAL_S,
  NUTATION_SPIN_DRAG_N_M_S,
  NUTATION_SPIN_INERTIA_KG_M2,
  NUTATION_TIP_DRAG_N_M_S,
  NUTATION_TRACE_CAPACITY,
  NUTATION_TRANSVERSE_INERTIA_KG_M2,
  NUTATION_WHEEL_MASS_KG,
} from "../../RigidBodyPrecessionConstants.js";

/** Slow motion factor, so the ~1.6 Hz nutation can be followed by eye. */
const SLOW_MOTION_FACTOR = 0.25;

export class NutationModel implements TModel {
  public readonly timer = new TimeModel(true);

  /** Normal or slow motion. Nutation and precession differ by roughly 5× in rate. */
  public readonly timeSpeedProperty = new EnumerationProperty(TimeSpeed.NORMAL);

  // ── Launch parameters (initial conditions) ──────────────────────────────────

  /** Body spin ω₃ about the symmetry axis at release (rad/s). */
  public readonly spinRateProperty = new NumberProperty(DEFAULT_NUTATION_SPIN_RAD_S);
  /** Tilt from the vertical at release (rad). */
  public readonly initialTiltProperty = new NumberProperty(DEFAULT_NUTATION_TILT_RAD, { units: "radians" });
  /** How the top is launched — sets φ̇(0), which selects cusps, loops, or waves. */
  public readonly releaseModeProperty = new Property<ReleaseMode>("cusp");
  /** Viscous drag and spin friction, which damp the nutation and spin the top down. */
  public readonly frictionEnabledProperty = new BooleanProperty(false);

  // ── Dynamical state ─────────────────────────────────────────────────────────

  public readonly thetaProperty = new NumberProperty(DEFAULT_NUTATION_TILT_RAD, { units: "radians" });
  public readonly thetaDotProperty = new NumberProperty(0);
  public readonly phiProperty = new NumberProperty(0, { units: "radians" });
  public readonly phiDotProperty = new NumberProperty(0);
  public readonly psiProperty = new NumberProperty(0, { units: "radians" });
  public readonly spinProperty = new NumberProperty(DEFAULT_NUTATION_SPIN_RAD_S);

  // ── Derived readouts ────────────────────────────────────────────────────────

  /** [θ_min, θ_max] band the axis is confined to, from the current invariants. */
  public readonly nutationBandProperty;
  /** Mean precession rate measured from the tip trace (rad/s). */
  public readonly meanPrecessionRateProperty;
  /** Nutation frequency I₃ω₃/I₁ (rad/s). */
  public readonly nutationFrequencyProperty;
  /** Minimum spin for steady precession at the current tilt (rad/s). */
  public readonly criticalSpinProperty;
  /** Whether the current spin admits steady precession at the current tilt. */
  public readonly aboveCriticalSpinProperty;
  /** Steady precession rate the top would need to hold its release tilt (rad/s). */
  public readonly steadyRateProperty;
  /**
   * Whether a top spun this fast would *sleep* — stand upright without toppling,
   * which needs I₃²ω₃² > 4 I₁ M g l.
   *
   * This is a prediction about a release the user can actually perform: wind the
   * tilt slider down to its minimum and the axis starts near vertical, so the
   * readout can be checked rather than taken on trust.
   */
  public readonly sleepingStableProperty;
  /** Total mechanical energy about the pivot (J) — constant while friction is off. */
  public readonly energyProperty;
  /** p_φ, angular momentum about the vertical (kg·m²/s) — also constant without friction. */
  public readonly verticalMomentumProperty;

  private readonly trace = new TopTipTrace(NUTATION_TRACE_CAPACITY);
  private sampleAccumulator = 0;

  public constructor() {
    this.nutationBandProperty = new DerivedProperty(
      [this.thetaProperty, this.thetaDotProperty, this.phiDotProperty, this.spinProperty],
      (): NutationBand => nutationTurningPoints(this.getParameters(), this.getState()),
    );

    this.meanPrecessionRateProperty = new DerivedProperty([this.phiProperty], () =>
      this.trace.estimateMeanPrecessionRate(),
    );

    this.nutationFrequencyProperty = new DerivedProperty([this.spinProperty], (spin) =>
      nutationFrequency(this.getParameters(), spin),
    );

    this.criticalSpinProperty = new DerivedProperty([this.thetaProperty], (theta) =>
      criticalSpinRate(this.getParameters(), theta),
    );

    this.aboveCriticalSpinProperty = new DerivedProperty(
      [this.spinProperty, this.thetaProperty],
      (spin, theta) => steadyPrecessionRates(this.getParameters(), spin, theta).exists,
    );

    this.steadyRateProperty = new DerivedProperty([this.spinProperty, this.initialTiltProperty], (spin, tilt) =>
      slowPrecessionRate(this.getParameters(), spin, tilt),
    );

    this.sleepingStableProperty = new DerivedProperty([this.spinProperty], (spin) =>
      isSleepingTopStable(this.getParameters(), spin),
    );

    this.energyProperty = new DerivedProperty(
      [this.thetaProperty, this.thetaDotProperty, this.phiDotProperty, this.spinProperty],
      () => totalEnergy(this.getParameters(), this.getState()),
    );

    this.verticalMomentumProperty = new DerivedProperty(
      [this.thetaProperty, this.phiDotProperty, this.spinProperty],
      () => verticalAngularMomentum(this.getParameters(), this.getState()),
    );

    // Every launch parameter is an initial condition, so changing one re-releases the top.
    this.spinRateProperty.lazyLink(() => this.release());
    this.initialTiltProperty.lazyLink(() => this.release());
    this.releaseModeProperty.lazyLink(() => this.release());

    this.release();
  }

  public getParameters(): HeavyTopParameters {
    const friction = this.frictionEnabledProperty.value;
    return {
      transverseInertia: NUTATION_TRANSVERSE_INERTIA_KG_M2,
      spinInertia: NUTATION_SPIN_INERTIA_KG_M2,
      mass: NUTATION_WHEEL_MASS_KG,
      gravity: GRAVITY_MPS2,
      comDistance: NUTATION_COM_DISTANCE_M,
      tipDrag: friction ? NUTATION_TIP_DRAG_N_M_S : 0,
      spinDrag: friction ? NUTATION_SPIN_DRAG_N_M_S : 0,
      maxTilt: NUTATION_MAX_TILT_RAD,
    };
  }

  public getState(): HeavyTopState {
    return {
      theta: this.thetaProperty.value,
      thetaDot: this.thetaDotProperty.value,
      phi: this.phiProperty.value,
      phiDot: this.phiDotProperty.value,
      psi: this.psiProperty.value,
      spin: this.spinProperty.value,
    };
  }

  public getTraceSamples() {
    return this.trace.toSamples();
  }

  public getThetaGraphPoints(): Array<{ x: number; y: number }> {
    return this.trace.toThetaDegreePoints();
  }

  /** Re-launch the top from the current launch parameters and clear the history. */
  public release(): void {
    const state = createReleaseState(
      this.getParameters(),
      this.spinRateProperty.value,
      this.initialTiltProperty.value,
      this.releaseModeProperty.value,
    );

    this.thetaProperty.value = state.theta;
    this.thetaDotProperty.value = state.thetaDot;
    this.phiProperty.value = state.phi;
    this.phiDotProperty.value = state.phiDot;
    this.psiProperty.value = state.psi;
    this.spinProperty.value = state.spin;

    this.trace.clear();
    this.sampleAccumulator = 0;
    this.timer.timeProperty.value = 0;
  }

  public step(dt: number): void {
    if (!this.timer.isPlayingProperty.value) {
      return;
    }
    this.stepOnce(this.timeSpeedProperty.value === TimeSpeed.SLOW ? dt * SLOW_MOTION_FACTOR : dt);
  }

  /** Advance the physics by dt regardless of the play/pause state (used by step-forward). */
  public stepOnce(dt: number): void {
    this.timer.timeProperty.value += dt;
    this.advance(dt);
  }

  private advance(dt: number): void {
    const next = stepHeavyTop(this.getParameters(), this.getState(), dt);

    this.thetaProperty.value = next.theta;
    this.thetaDotProperty.value = next.thetaDot;
    this.phiDotProperty.value = next.phiDot;
    this.psiProperty.value = next.psi;
    this.spinProperty.value = next.spin;
    // Set φ last: the mean-precession readout derives from it and reads the trace.
    this.sampleAccumulator += dt;
    if (this.sampleAccumulator >= NUTATION_SAMPLE_INTERVAL_S) {
      this.trace.push(this.timer.timeProperty.value, next.theta, next.phi);
      this.sampleAccumulator = 0;
    }
    this.phiProperty.value = next.phi;
  }

  public reset(): void {
    this.timer.reset();
    this.timeSpeedProperty.reset();
    this.spinRateProperty.reset();
    this.initialTiltProperty.reset();
    this.releaseModeProperty.reset();
    this.frictionEnabledProperty.reset();
    this.release();
  }

  public dispose(): void {
    this.timer.dispose();
    this.timeSpeedProperty.dispose();
    this.spinRateProperty.dispose();
    this.initialTiltProperty.dispose();
    this.releaseModeProperty.dispose();
    this.frictionEnabledProperty.dispose();
    this.thetaProperty.dispose();
    this.thetaDotProperty.dispose();
    this.phiProperty.dispose();
    this.phiDotProperty.dispose();
    this.psiProperty.dispose();
    this.spinProperty.dispose();
    this.nutationBandProperty.dispose();
    this.meanPrecessionRateProperty.dispose();
    this.nutationFrequencyProperty.dispose();
    this.criticalSpinProperty.dispose();
    this.aboveCriticalSpinProperty.dispose();
    this.steadyRateProperty.dispose();
    this.sleepingStableProperty.dispose();
    this.energyProperty.dispose();
    this.verticalMomentumProperty.dispose();
  }
}
