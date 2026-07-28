/**
 * SpinPhase.ts
 *
 * A spinning wheel drawn at its true phase is unreadable: at 60 fps anything past a
 * few turns per second strobes, and a 30 Hz gyroscope looks frozen or backwards.
 * That is the single biggest reason a gyroscope animation is hard to parse.
 *
 * This tracker draws the wheel at a *capped* rate instead, and reports how far past
 * the legible limit the real spin is so the renderer can blur the markings out. The
 * direction of rotation is always truthful; only the rate is compressed, the same
 * way a stroboscope shows a slow apparent rotation of a fast wheel.
 *
 * The phase is integrated from the model's clock rather than from the body's spin
 * angle, so pausing, stepping, slow motion, and reset all come for free.
 */

/**
 * Fastest apparent spin the renderer will draw (rad/s). One turn per ~3 s: slow
 * enough that the four-fold rim pattern never aliases at 60 fps.
 */
export const MAX_LEGIBLE_SPIN_RAD_S = 2.2;

/** Spin ratio above the cap at which the markings are fully washed out. */
const FULL_BLUR_RATIO = 10;

export class SpinPhaseTracker {
  private phase = 0;
  private lastTime = 0;

  /**
   * Advance to `time` at the given true spin rate and return the phase to draw.
   * A clock that jumps backwards (reset, re-release) restarts the phase.
   */
  public phaseAt(time: number, spinRate: number): number {
    const dt = time - this.lastTime;
    this.lastTime = time;

    if (dt < 0) {
      this.phase = 0;
      return 0;
    }
    const drawnRate = Math.sign(spinRate) * Math.min(Math.abs(spinRate), MAX_LEGIBLE_SPIN_RAD_S);
    this.phase = (this.phase + drawnRate * dt) % (2 * Math.PI);
    return this.phase;
  }

  public reset(): void {
    this.phase = 0;
    this.lastTime = 0;
  }
}

/**
 * How far past the legible limit a spin rate is, on 0–1. Renderers fade the painted
 * markings by this amount and replace them with rotational blur.
 */
export function spinBlurFor(spinRate: number): number {
  const ratio = Math.abs(spinRate) / MAX_LEGIBLE_SPIN_RAD_S;
  if (ratio <= 1) {
    return 0;
  }
  return Math.min(1, (ratio - 1) / (FULL_BLUR_RATIO - 1));
}
