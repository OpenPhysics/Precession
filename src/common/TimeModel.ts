/**
 * TimeModel.ts
 *
 * A reusable, composable timing model for simulations that need play/pause and
 * elapsed-time tracking. Compose it into your screen model rather than
 * extending it.
 *
 * ── Usage ─────────────────────────────────────────────────────────────────────
 *
 *   // In YourModel.ts
 *   import { TimeModel } from "../../common/TimeModel.js";
 *
 *   export class YourModel implements TModel {
 *     public readonly timer = new TimeModel();
 *
 *     public step( dt: number ): void {
 *       if ( !this.timer.isPlayingProperty.value ) { return; }
 *       this.stepOnce( dt );
 *     }
 *
 *     // Advances regardless of play/pause, so step-forward can drive it.
 *     public stepOnce( dt: number ): void {
 *       this.timer.timeProperty.value += dt;
 *       // integrate the physics by dt …
 *     }
 *
 *     public reset(): void {
 *       this.timer.reset();
 *       // reset other state …
 *     }
 *   }
 *
 *   Note what that shape buys you. `timer.step()` alone stops the *clock* when
 *   paused but not the model: a step() that keeps integrating below it leaves the
 *   sim animating through a pause, with every sample stamped at the same frozen
 *   time. Gate the whole of step() on isPlayingProperty, and keep the clock and the
 *   physics moving together in stepOnce().
 *
 * ── View wiring ───────────────────────────────────────────────────────────────
 *
 *   SceneryStack ships a TimeControlNode that binds directly to isPlayingProperty.
 *   Point step-forward at stepOnce — it has to work while paused, which is the one
 *   moment step() deliberately does nothing:
 *
 *   import { TimeControlNode } from "scenerystack/scenery-phet";
 *
 *   const timeControl = new TimeControlNode( model.timer.isPlayingProperty, {
 *     playPauseStepButtonOptions: {
 *       stepForwardButtonOptions: {
 *         listener: () => model.stepOnce( 1 / 60 ),
 *       },
 *     },
 *   });
 *
 * ── Start paused vs. playing ──────────────────────────────────────────────────
 *
 *   new TimeModel()           // starts paused  (most physics sims)
 *   new TimeModel( true )     // starts playing  (continuous animations)
 */

import { BooleanProperty, NumberProperty } from "scenerystack/axon";

export class TimeModel {
  /** Whether the simulation clock is running. Bind to TimeControlNode. */
  public readonly isPlayingProperty: BooleanProperty;

  /** Elapsed simulation time in seconds. Resets to 0 on reset(). */
  public readonly timeProperty: NumberProperty;

  public constructor(initiallyPlaying = false) {
    this.isPlayingProperty = new BooleanProperty(initiallyPlaying);
    this.timeProperty = new NumberProperty(0, { units: "s" });
  }

  /**
   * Advance the simulation clock by dt seconds.
   * Call this from your model's step() method.
   */
  public step(dt: number): void {
    if (this.isPlayingProperty.value) {
      this.timeProperty.value += dt;
    }
  }

  /** Resets clock and playback state to their initial values. */
  public reset(): void {
    this.isPlayingProperty.reset();
    this.timeProperty.reset();
  }

  /** Call when the model is no longer needed to free AXON listeners. */
  public dispose(): void {
    this.isPlayingProperty.dispose();
    this.timeProperty.dispose();
  }
}
