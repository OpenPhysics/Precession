/**
 * TopTipTrace.ts
 *
 * Fixed-length circular buffer of (t, θ, φ) samples for the nutation screen.
 * Feeds both the tip path drawn on the unit sphere and the θ(t) graph.
 */

export type TipSample = {
  readonly time: number;
  /** Nutation angle from the upward vertical (rad). */
  readonly theta: number;
  /** Unwrapped precession angle (rad). */
  readonly phi: number;
};

export class TopTipTrace {
  private readonly capacity: number;
  private readonly times: Float64Array;
  private readonly thetas: Float64Array;
  private readonly phis: Float64Array;
  private count = 0;
  private startIndex = 0;

  public constructor(capacity: number) {
    this.capacity = capacity;
    this.times = new Float64Array(capacity);
    this.thetas = new Float64Array(capacity);
    this.phis = new Float64Array(capacity);
  }

  public push(time: number, theta: number, phi: number): void {
    const index = (this.startIndex + this.count) % this.capacity;
    this.times[index] = time;
    this.thetas[index] = theta;
    this.phis[index] = phi;
    if (this.count < this.capacity) {
      this.count++;
    } else {
      this.startIndex = (this.startIndex + 1) % this.capacity;
    }
  }

  public clear(): void {
    this.count = 0;
    this.startIndex = 0;
  }

  public getSampleCount(): number {
    return this.count;
  }

  private indexAt(offset: number): number {
    return (this.startIndex + offset) % this.capacity;
  }

  public toSamples(): TipSample[] {
    const samples: TipSample[] = [];
    for (let i = 0; i < this.count; i++) {
      const index = this.indexAt(i);
      samples.push({
        time: this.times[index] ?? 0,
        theta: this.thetas[index] ?? 0,
        phi: this.phis[index] ?? 0,
      });
    }
    return samples;
  }

  /** θ(t) in the {x, y} form the Bamboo LinePlot consumes, with θ in degrees. */
  public toThetaDegreePoints(): Array<{ x: number; y: number }> {
    const points: Array<{ x: number; y: number }> = [];
    for (let i = 0; i < this.count; i++) {
      const index = this.indexAt(i);
      points.push({
        x: this.times[index] ?? 0,
        y: ((this.thetas[index] ?? 0) * 180) / Math.PI,
      });
    }
    return points;
  }

  /**
   * Mean precession rate over the buffered window (rad/s), i.e. the slope of the
   * unwrapped φ. This is the rate a stopwatch would measure — it averages the
   * nutation ripple away, unlike the instantaneous φ̇.
   */
  public estimateMeanPrecessionRate(minSamples = 8): number {
    if (this.count < minSamples) {
      return 0;
    }
    const first = this.indexAt(0);
    const last = this.indexAt(this.count - 1);
    const dt = (this.times[last] ?? 0) - (this.times[first] ?? 0);
    if (Math.abs(dt) < 1e-9) {
      return 0;
    }
    return ((this.phis[last] ?? 0) - (this.phis[first] ?? 0)) / dt;
  }
}
