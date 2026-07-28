/**
 * BambooChartUtils.ts
 *
 * Shared helpers for Bamboo chart nodes in this simulation.
 */

/**
 * Choose a readable tick spacing for a given axis span (~5 ticks).
 */
export function calculateTickSpacing(rangeLength: number): number {
  if (!Number.isFinite(rangeLength) || rangeLength <= 0) {
    return 1;
  }

  const targetTicks = 5;
  const roughSpacing = rangeLength / targetTicks;

  if (roughSpacing < 1e-10) {
    return 1e-10;
  }

  const magnitude = 10 ** Math.floor(Math.log10(roughSpacing));
  const residual = roughSpacing / magnitude;

  let spacing: number;
  if (residual <= 1.5) {
    spacing = magnitude;
  } else if (residual <= 3.5) {
    spacing = 2 * magnitude;
  } else if (residual <= 7.5) {
    spacing = 5 * magnitude;
  } else {
    spacing = 10 * magnitude;
  }

  return Math.max(spacing, rangeLength / 20);
}

/**
 * Decimal places that show a tick spacing without redundant zeros, so a 0.5-spaced
 * axis reads "1.5" and a 2-spaced axis reads "4" rather than "4.00".
 */
export function tickDecimalsFor(spacing: number): number {
  if (!Number.isFinite(spacing) || spacing <= 0) {
    return 0;
  }
  return Math.max(0, Math.min(3, Math.ceil(-Math.log10(spacing))));
}
