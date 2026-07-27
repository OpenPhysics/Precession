/**
 * GyroscopeKinematics.test.ts
 */

import { Vector2 } from "scenerystack/dot";
import { describe, expect, it } from "vitest";
import {
  computeAxleGeometry,
  computeVectorDiagramGeometry,
  horizontalOrbitTangent,
  projectAxlePoint,
} from "../src/common/rigid-body/GyroscopeKinematics.js";

const PIVOT = new Vector2(100, 200);
const TILT = Math.PI / 4;

describe("GyroscopeKinematics", () => {
  it("projects axle points with positive x when tilted forward", () => {
    const tip = projectAxlePoint(PIVOT, 0.35, 0, TILT, 300, 0.5);
    expect(tip.x).toBeGreaterThan(PIVOT.x);
    expect(tip.y).toBeLessThan(PIVOT.y);
  });

  it("tip orbit radius scales with sin(tilt)", () => {
    const geom = computeAxleGeometry(PIVOT, 0, TILT, 0.35, 0.15, 300, 0.5);
    expect(geom.orbitRadiusX).toBeCloseTo(0.35 * 300 * Math.sin(TILT), 1);
  });

  it("torque direction is horizontal tangent to L orbit", () => {
    const geom = computeVectorDiagramGeometry(PIVOT, Math.PI / 2, TILT, 90, 72, true);
    expect(geom.torqueDirection.x).toBeCloseTo(-1, 5);
    expect(geom.torqueDirection.y).toBeCloseTo(0, 5);
  });

  it("returns zero torque direction when hasTorque is false", () => {
    const geom = computeVectorDiagramGeometry(PIVOT, 0, TILT, 90, 72, false);
    expect(geom.torqueDirection.equals(Vector2.ZERO)).toBe(true);
  });

  it("torque direction is defined at side-view turning points", () => {
    expect(horizontalOrbitTangent(0).equals(new Vector2(-1, 0))).toBe(true);
    expect(horizontalOrbitTangent(Math.PI).equals(new Vector2(1, 0))).toBe(true);

    const atZero = computeVectorDiagramGeometry(PIVOT, 0, TILT, 90, 72, true);
    expect(atZero.torqueDirection.magnitude).toBeCloseTo(1, 5);
    expect(atZero.torqueDirection.x).toBeCloseTo(-1, 5);
  });
});
