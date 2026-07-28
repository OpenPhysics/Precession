/**
 * Camera3D.test.ts
 *
 * The projection is the foundation every scene draws through, so these pin down the
 * two properties the renderers actually rely on: that `depth` orders points correctly
 * front-to-back, and that a circle maps to an exact ellipse.
 */

import { Vector2, Vector3 } from "scenerystack/dot";
import { describe, expect, it } from "vitest";
import {
  axisFrame,
  circlePoint,
  createCamera,
  depth,
  project,
  projectCircle,
  projectDirection,
  shadeFactor,
  symmetryAxis,
} from "../src/common/view/Camera3D.js";

const ORIGIN = new Vector2(100, 100);

describe("Camera3D", () => {
  it("puts the world origin at the camera origin", () => {
    const camera = createCamera(ORIGIN, 200, 25);
    const point = project(camera, Vector3.ZERO);
    expect(point.x).toBeCloseTo(ORIGIN.x, 9);
    expect(point.y).toBeCloseTo(ORIGIN.y, 9);
  });

  it("maps +x to screen right and +z to screen up at any elevation", () => {
    for (const elevation of [0, 20, 45, 89]) {
      const camera = createCamera(ORIGIN, 100, elevation);
      expect(projectDirection(camera, new Vector3(1, 0, 0)).x).toBeGreaterThan(0);
      // Screen y grows downward, so "up" means a negative y offset.
      expect(projectDirection(camera, new Vector3(0, 0, 1)).y).toBeLessThan(0);
    }
  });

  it("reports greater depth for points farther from the camera", () => {
    const camera = createCamera(ORIGIN, 200, 24);
    // The camera sits in the −y half space looking toward +y.
    expect(depth(camera, new Vector3(0, 1, 0))).toBeGreaterThan(depth(camera, new Vector3(0, -1, 0)));
    // It is also raised, so higher points are nearer.
    expect(depth(camera, new Vector3(0, 0, 1))).toBeLessThan(depth(camera, new Vector3(0, 0, -1)));
  });

  it("collapses depth onto the vertical when looking straight down", () => {
    const camera = createCamera(ORIGIN, 100, 90);
    expect(depth(camera, new Vector3(0, 5, 0))).toBeCloseTo(0, 9);
    expect(depth(camera, new Vector3(0, 0, 1))).toBeCloseTo(-1, 9);
  });

  it("projects a circle to points that all lie on one ellipse", () => {
    const camera = createCamera(ORIGIN, 180, 30);
    const theta = 0.7;
    const phi = 1.3;
    const radius = 0.4;
    const { e1, e2 } = axisFrame(theta, phi);
    const center = symmetryAxis(theta, phi).timesScalar(0.5);
    const circle = projectCircle(camera, center, e1, e2, radius);

    // Every sample must equal the projection of the corresponding 3-D point exactly:
    // the map is linear, so the ellipse is not an approximation.
    for (let i = 0; i < 12; i++) {
      const alpha = (i / 12) * 2 * Math.PI;
      const world = center
        .plus(e1.timesScalar(radius * Math.cos(alpha)))
        .plus(e2.timesScalar(radius * Math.sin(alpha)));
      const direct = project(camera, world);
      const viaEllipse = circlePoint(circle, alpha);
      expect(viaEllipse.x).toBeCloseTo(direct.x, 9);
      expect(viaEllipse.y).toBeCloseTo(direct.y, 9);
    }
  });

  it("gives an orthonormal frame perpendicular to the symmetry axis", () => {
    for (const [theta, phi] of [
      [0.1, 0],
      [0.9, 2.2],
      [1.5, -1.1],
    ] as const) {
      const axis = symmetryAxis(theta, phi);
      const { e1, e2 } = axisFrame(theta, phi);
      expect(axis.magnitude).toBeCloseTo(1, 9);
      expect(e1.magnitude).toBeCloseTo(1, 9);
      expect(e2.magnitude).toBeCloseTo(1, 9);
      expect(axis.dot(e1)).toBeCloseTo(0, 9);
      expect(axis.dot(e2)).toBeCloseTo(0, 9);
      expect(e1.dot(e2)).toBeCloseTo(0, 9);
    }
  });

  it("shades a face toward the light brighter than one away from it", () => {
    const towardLight = new Vector3(-0.45, -0.55, -0.7).normalized().negated();
    expect(shadeFactor(towardLight)).toBeGreaterThan(shadeFactor(towardLight.negated()));
    // Ambient keeps the dark side visible rather than black.
    expect(shadeFactor(towardLight.negated())).toBeGreaterThan(0);
    expect(shadeFactor(towardLight)).toBeLessThanOrEqual(1);
  });
});
