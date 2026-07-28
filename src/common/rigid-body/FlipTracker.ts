/**
 * FlipTracker.ts
 *
 * Counts the flips of a tumbling body and measures how long they take.
 *
 * The tennis-racket flip is easy to *see* and surprisingly hard to *quantify*: the
 * block turns over, but "turns over" has to be pinned to a number before it can be
 * read off a panel. The observable used here is the alignment
 *
 *   s = (component of L along the launch axis) / |L|  ∈ [−1, 1]
 *
 * which is the cosine of the angle between the fixed angular momentum and the body
 * axis the block was launched about. It needs no orientation and no unwrapping: at
 * launch the block spins about that axis, so s ≈ +1; after a flip the same body axis
 * points the other way along L, so s ≈ −1. Spun about a stable axis, s merely ripples
 * near +1 and never changes sign, which is exactly the "no flips" answer.
 *
 * Sign changes are confirmed through a hysteresis band rather than at s = 0, so a
 * body lingering near the crossing cannot ring up a burst of spurious flips.
 */

/**
 * |s| a candidate sign must reach before the flip is confirmed. Well outside the
 * ripple of a stable axis (which stays above 0.9 for any sane nudge), and well
 * inside the ±1 an actual flip reaches.
 */
export const FLIP_CONFIRM_THRESHOLD = 0.5;

export type FlipStatistics = {
  /** Flips confirmed since the last reset. */
  readonly count: number;
  /** Seconds between the two most recent flips; 0 until two have been seen. */
  readonly lastInterval: number;
  /** Mean seconds between flips over the whole run; 0 until two have been seen. */
  readonly meanInterval: number;
};

export const NO_FLIPS: FlipStatistics = { count: 0, lastInterval: 0, meanInterval: 0 };

export class FlipTracker {
  /** Last confirmed side of the hysteresis band; 0 before either side is reached. */
  private confirmedSign: -1 | 0 | 1 = 0;
  private count = 0;
  private firstFlipTime = 0;
  private lastFlipTime = 0;
  private lastInterval = 0;

  /**
   * Feed one sample of the alignment `s` at time `t`.
   *
   * @returns true when this sample confirmed a flip.
   */
  public update(time: number, alignment: number): boolean {
    const side: -1 | 0 | 1 = alignment > FLIP_CONFIRM_THRESHOLD ? 1 : alignment < -FLIP_CONFIRM_THRESHOLD ? -1 : 0;

    // Inside the band: not enough evidence either way, so hold the previous side.
    if (side === 0) {
      return false;
    }

    if (this.confirmedSign === 0) {
      this.confirmedSign = side;
      return false;
    }

    if (side === this.confirmedSign) {
      return false;
    }

    this.confirmedSign = side;
    this.count++;
    if (this.count === 1) {
      this.firstFlipTime = time;
    } else {
      this.lastInterval = time - this.lastFlipTime;
    }
    this.lastFlipTime = time;
    return true;
  }

  public getStatistics(): FlipStatistics {
    return {
      count: this.count,
      lastInterval: this.lastInterval,
      meanInterval: this.count > 1 ? (this.lastFlipTime - this.firstFlipTime) / (this.count - 1) : 0,
    };
  }

  public reset(): void {
    this.confirmedSign = 0;
    this.count = 0;
    this.firstFlipTime = 0;
    this.lastFlipTime = 0;
    this.lastInterval = 0;
  }
}
