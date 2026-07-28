/**
 * UnitProxyProperty.ts
 *
 * A display-unit view of a model property: rad/s shown as Hz, radians shown as
 * degrees. Edits flow both ways, so a slider can be bound to the proxy while the
 * model keeps its SI units.
 *
 * ── Why the guard has to cover both directions ────────────────────────────────
 *
 * The obvious implementation — write through in each direction, suppressing only
 * the echo of a user edit — is subtly broken, because `value * scale / scale` is
 * not the identity in floating point. Round-tripping 7 rad/s through Hz gives back
 * 7.000000000000001, which is a *different* number, so the write is not swallowed
 * as a no-op the way an exact round trip would be. Set the model property (a Reset
 * All, say) and the sequence runs:
 *
 *   model → notifies → proxy set → notifies → model set to 7.000000000000001
 *
 * with that last write landing while the model property is still notifying its
 * listeners: axon's reentry assertion, and in a production build a silently
 * drifting value instead.
 *
 * One flag held across *both* links fixes it. Whichever side the change starts on
 * owns the sync for its duration, and the other side updates without answering back.
 */

import { NumberProperty, type NumberPropertyOptions } from "scenerystack/axon";
import { clamp, type Range } from "scenerystack/dot";

/** The unit strings axon recognizes, so a typo cannot reach a NumberProperty. */
export type DisplayUnits = NonNullable<NumberPropertyOptions["units"]>;

/**
 * @param property - the model property, in model units
 * @param scale - display units per model unit (e.g. 1/2π for rad/s → Hz)
 * @param range - the display-unit range the proxy is clamped to
 * @param units - display units, for the NumberProperty metadata
 */
export function createUnitProxy(
  property: NumberProperty,
  scale: number,
  range: Range,
  units: DisplayUnits,
): NumberProperty {
  const proxy = new NumberProperty(clamp(property.value * scale, range.min, range.max), { units });

  let syncing = false;

  property.link((value) => {
    if (syncing) {
      return;
    }
    syncing = true;
    proxy.value = clamp(value * scale, range.min, range.max);
    syncing = false;
  });

  proxy.lazyLink((value) => {
    if (syncing) {
      return;
    }
    syncing = true;
    property.value = value / scale;
    syncing = false;
  });

  return proxy;
}
