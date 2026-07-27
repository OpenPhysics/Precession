/**
 * PrecessionDataSeries.ts
 *
 * Fixed-length circular buffer for plotting precession angle vs. time.
 */

export type PrecessionSample = {
  readonly time: number;
  readonly precessionAngle: number;
};

export class PrecessionDataSeries {
  private readonly capacity: number;
  private readonly times: Float64Array;
  private readonly angles: Float64Array;
  private count = 0;
  private startIndex = 0;

  public constructor(capacity: number) {
    this.capacity = capacity;
    this.times = new Float64Array(capacity);
    this.angles = new Float64Array(capacity);
  }

  public push(time: number, precessionAngle: number): void {
    const index = (this.startIndex + this.count) % this.capacity;
    this.times[index] = time;
    this.angles[index] = precessionAngle;
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

  public toPlotPoints(): Array<{ x: number; y: number }> {
    const points: Array<{ x: number; y: number }> = [];
    for (let i = 0; i < this.count; i++) {
      const index = (this.startIndex + i) % this.capacity;
      points.push({ x: this.times[index] ?? 0, y: this.angles[index] ?? 0 });
    }
    return points;
  }

  /**
   * Estimate the precession rate from the slope of the most recent samples.
   */
  public estimateSlope(minSamples = 4): number {
    if (this.count < minSamples) {
      return 0;
    }
    const firstIndex = (this.startIndex + this.count - minSamples) % this.capacity;
    const lastIndex = (this.startIndex + this.count - 1) % this.capacity;
    const t0 = this.times[firstIndex] ?? 0;
    const t1 = this.times[lastIndex] ?? 0;
    const phi0 = this.angles[firstIndex] ?? 0;
    const phi1 = this.angles[lastIndex] ?? 0;
    const dt = t1 - t0;
    if (Math.abs(dt) < 1e-9) {
      return 0;
    }
    return (phi1 - phi0) / dt;
  }
}
