/**
 * UnitProxyProperty.test.ts
 *
 * The regression these guard is a floating-point one: `value * scale / scale` is not
 * the identity, so a proxy that suppresses only the echo of a *user* edit will write
 * a slightly-different value back into the model property while that property is
 * still notifying — axon reentry, and a value that drifts on every round trip.
 */

import { NumberProperty } from "scenerystack/axon";
import { Range } from "scenerystack/dot";
import { describe, expect, it } from "vitest";
import { createUnitProxy } from "../src/common/view/UnitProxyProperty.js";

const HZ_PER_RAD_S = 1 / (2 * Math.PI);
const DEGREES_PER_RADIAN = 180 / Math.PI;

describe("createUnitProxy", () => {
  it("starts at the property's value in display units", () => {
    const property = new NumberProperty(7);
    const proxy = createUnitProxy(property, HZ_PER_RAD_S, new Range(0, 5), "Hz");
    expect(proxy.value).toBeCloseTo(7 * HZ_PER_RAD_S, 12);
  });

  it("clamps the initial value into the display range", () => {
    const property = new NumberProperty(100);
    const proxy = createUnitProxy(property, 1, new Range(0, 10), "m");
    expect(proxy.value).toBe(10);
  });

  it("writes user edits back to the property in model units", () => {
    const property = new NumberProperty(7);
    const proxy = createUnitProxy(property, HZ_PER_RAD_S, new Range(0, 5), "Hz");
    proxy.value = 2;
    expect(property.value).toBeCloseTo(2 / HZ_PER_RAD_S, 12);
  });

  it("tracks the property when the model changes it", () => {
    const property = new NumberProperty(Math.PI / 4);
    const proxy = createUnitProxy(property, DEGREES_PER_RADIAN, new Range(0, 90), "°");
    property.value = Math.PI / 3;
    expect(proxy.value).toBeCloseTo(60, 9);
  });

  it("does not write back into a property that is still notifying", () => {
    // 7 rad/s round-trips through Hz to 7.000000000000001, so an asymmetric guard
    // re-enters here. The listener records anything that arrives mid-notification.
    const property = new NumberProperty(1);
    const proxy = createUnitProxy(property, HZ_PER_RAD_S, new Range(0, 5), "Hz");

    let notifying = false;
    let reentered = false;
    property.link(() => {
      if (notifying) {
        reentered = true;
        return;
      }
      notifying = true;
      notifying = false;
    });

    property.value = 7;
    expect(reentered).toBe(false);
    expect(property.value).toBe(7);
    expect(proxy.value).toBeCloseTo(7 * HZ_PER_RAD_S, 12);
  });

  it("leaves the property exactly where the model put it, across repeated sets", () => {
    const property = new NumberProperty(1);
    createUnitProxy(property, HZ_PER_RAD_S, new Range(0, 20), "Hz");

    // Values whose Hz round trip is inexact. Without a symmetric guard each set
    // ratchets the property by an ulp or two.
    for (const value of [7, 3, 11, 7, 0.1]) {
      property.value = value;
      expect(property.value).toBe(value);
    }
  });

  it("survives a reset of the underlying property", () => {
    const property = new NumberProperty(7);
    const proxy = createUnitProxy(property, HZ_PER_RAD_S, new Range(0, 5), "Hz");

    proxy.value = 2;
    property.reset();

    expect(property.value).toBe(7);
    expect(proxy.value).toBeCloseTo(7 * HZ_PER_RAD_S, 12);
  });
});
