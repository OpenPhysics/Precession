/**
 * FlipTracker.test.ts
 *
 * The tracker turns "the block turned over" into a number, so the things worth
 * pinning down are the two ways that could go wrong: missing a genuine reversal,
 * and inventing reversals out of a signal that merely loiters near zero.
 */

import { describe, expect, it } from "vitest";
import { FLIP_CONFIRM_THRESHOLD, FlipTracker } from "../src/common/rigid-body/FlipTracker.js";

describe("FlipTracker", () => {
  it("counts nothing for a signal that never changes sign", () => {
    const tracker = new FlipTracker();
    for (let i = 0; i < 500; i++) {
      // A stable axis: ripples about +1, never crosses.
      tracker.update(i / 60, 0.95 + 0.04 * Math.sin(i / 7));
    }
    expect(tracker.getStatistics().count).toBe(0);
  });

  it("counts one flip per confirmed sign change", () => {
    const tracker = new FlipTracker();
    tracker.update(0, 1);
    expect(tracker.update(1, -1)).toBe(true);
    expect(tracker.update(2, -1)).toBe(false);
    expect(tracker.update(3, 1)).toBe(true);
    expect(tracker.getStatistics().count).toBe(2);
  });

  it("does not count a sample inside the hysteresis band", () => {
    const tracker = new FlipTracker();
    tracker.update(0, 1);
    // Dipping to the very edge of the band, and back, is not a flip.
    expect(tracker.update(1, FLIP_CONFIRM_THRESHOLD * 0.99)).toBe(false);
    expect(tracker.update(2, -FLIP_CONFIRM_THRESHOLD * 0.99)).toBe(false);
    expect(tracker.update(3, 0)).toBe(false);
    expect(tracker.getStatistics().count).toBe(0);

    // Only once the opposite side is properly reached does it register.
    expect(tracker.update(4, -1)).toBe(true);
    expect(tracker.getStatistics().count).toBe(1);
  });

  it("measures the interval between successive flips", () => {
    const tracker = new FlipTracker();
    tracker.update(0, 1);
    tracker.update(2, -1);
    tracker.update(5, 1);
    tracker.update(8, -1);

    const statistics = tracker.getStatistics();
    expect(statistics.count).toBe(3);
    expect(statistics.lastInterval).toBeCloseTo(3, 9);
    // Three flips at t = 2, 5, 8 — two gaps of 3 s each.
    expect(statistics.meanInterval).toBeCloseTo(3, 9);
  });

  it("reports no interval until a second flip has been seen", () => {
    const tracker = new FlipTracker();
    tracker.update(0, 1);
    tracker.update(2, -1);
    const statistics = tracker.getStatistics();
    expect(statistics.count).toBe(1);
    expect(statistics.meanInterval).toBe(0);
    expect(statistics.lastInterval).toBe(0);
  });

  it("reset clears the count and the timing", () => {
    const tracker = new FlipTracker();
    tracker.update(0, 1);
    tracker.update(1, -1);
    tracker.update(2, 1);
    tracker.reset();
    expect(tracker.getStatistics()).toEqual({ count: 0, lastInterval: 0, meanInterval: 0 });

    // After a reset the first side seen is a baseline, not a flip.
    expect(tracker.update(3, -1)).toBe(false);
    expect(tracker.getStatistics().count).toBe(0);
  });
});
