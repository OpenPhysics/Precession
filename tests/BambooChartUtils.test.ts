/**
 * BambooChartUtils.test.ts
 */

import { describe, expect, it } from "vitest";
import { calculateTickSpacing } from "../src/common/view/BambooChartUtils.js";

describe("calculateTickSpacing", () => {
  it("returns a positive spacing for typical ranges", () => {
    expect(calculateTickSpacing(10)).toBeGreaterThan(0);
    expect(calculateTickSpacing(4)).toBeGreaterThan(0);
  });

  it("handles invalid input", () => {
    expect(calculateTickSpacing(0)).toBe(1);
    expect(calculateTickSpacing(Number.NaN)).toBe(1);
  });
});
