/**
 * SpinningWheelNode.ts
 *
 * The gyroscope wheel itself, drawn so that it reads as a solid object rather
 * than a flat ellipse. Shared by the steady-precession and nutation screens.
 *
 * Three things make it legible:
 *
 *  1. **Thickness.** The wheel is a short cylinder, and its side band is the exact
 *     convex hull of the two projected rim circles (see `bandShape`). At any tilt
 *     you see a real edge, so the wheel never collapses into a line.
 *  2. **Occlusion.** The axle is split at the wheel and its two halves are drawn on
 *     opposite sides of the disk, so which end points toward you is unambiguous.
 *     A ground shadow anchors the wheel in space.
 *  3. **Spin you can actually see.** Painted quadrants and rim studs turn with the
 *     body, but at the *displayed* phase, which is rate-capped by the caller — a
 *     wheel spinning at 30 Hz strobes into nonsense at 60 fps. Beyond the cap the
 *     markings blur out instead of lying about the rate.
 */

import { type Vector2, Vector3 } from "scenerystack/dot";
import { Shape } from "scenerystack/kite";
import { type Color, LinearGradient, Node, Path } from "scenerystack/scenery";
import {
  axisFrame,
  type Camera3D,
  circleArcPoints,
  circlePoint,
  depth,
  project,
  projectCircle,
  projectDirection,
  projectHorizontalCircle,
  shadeColor,
  shadeFactor,
  symmetryAxis,
  TOWARD_LIGHT,
} from "./Camera3D.js";
import { cylinderShapes } from "./CylinderShapes.js";

export type WheelGeometry = {
  /** Rim radius (m). */
  readonly radius: number;
  /** Half of the wheel's axial thickness (m). */
  readonly halfThickness: number;
  /** Hub radius (m) — the boss the axle passes through. */
  readonly hubRadius: number;
  /** Distance from the pivot to the wheel's mid-plane along the axle (m). */
  readonly comDistance: number;
  /** Total drawn axle length from the pivot (m). */
  readonly axleLength: number;
  /** Radius of the drawn axle (m). */
  readonly axleRadius: number;
};

export type WheelState = {
  /** Tilt of the symmetry axis from the upward vertical (rad). */
  readonly theta: number;
  /** Azimuth of the symmetry axis about the vertical (rad). */
  readonly phi: number;
  /** Spin phase to *draw* (rad) — rate-capped by the caller, not the physical ψ. */
  readonly psiDisplay: number;
  /**
   * How far past the legible spin rate the wheel actually is, 0–1. At 1 the painted
   * markings wash out, which is the honest reading of "too fast to resolve".
   */
  readonly spinBlur: number;
};

export type WheelPalette = {
  /** Base color of the wheel's faces and rim. */
  readonly body: Color;
  /** Contrasting color of the painted quadrants and rim studs. */
  readonly marking: Color;
  /** Axle and hub color. */
  readonly axle: Color;
  /** Ground shadow color (already translucent). */
  readonly shadow: Color;
};

/** Rim samples per full circle. 64 is smooth at every size the sim draws. */
const RIM_SAMPLES = 64;

export class SpinningWheelNode extends Node {
  private readonly shadowPath = new Path(null);
  private readonly axleBehind = new Path(null);
  private readonly bandPath = new Path(null);
  private readonly facePath = new Path(null);
  private readonly sectorPath = new Path(null);
  private readonly blurPath = new Path(null);
  private readonly groovePath = new Path(null);
  private readonly rimPath = new Path(null);
  private readonly studPath = new Path(null);
  private readonly hubPath = new Path(null);
  private readonly axleFront = new Path(null);

  private readonly camera: Camera3D;
  private readonly geometry: WheelGeometry;
  private palette: WheelPalette;
  /** Height of the ground plane the shadow falls on (m), or null for no shadow. */
  private readonly groundZ: number | null;

  public constructor(camera: Camera3D, geometry: WheelGeometry, palette: WheelPalette, options?: { groundZ?: number }) {
    super();
    this.camera = camera;
    this.geometry = geometry;
    this.palette = palette;
    this.groundZ = options?.groundZ ?? null;

    this.children = [
      this.shadowPath,
      this.axleBehind,
      this.bandPath,
      this.facePath,
      this.sectorPath,
      this.blurPath,
      this.groovePath,
      this.rimPath,
      this.studPath,
      this.hubPath,
      this.axleFront,
    ];
  }

  /** Swap the palette (theme change) — the caller re-runs `update` afterwards. */
  public setPalette(palette: WheelPalette): void {
    this.palette = palette;
  }

  public update(state: WheelState): void {
    const camera = this.camera;
    const geometry = this.geometry;
    const palette = this.palette;
    const { theta, phi, psiDisplay, spinBlur } = state;

    const axis = symmetryAxis(theta, phi);
    const { e1, e2 } = axisFrame(theta, phi);
    const axisDepth = depth(camera, axis);

    const midCenter = axis.timesScalar(geometry.comDistance);
    const wheel = cylinderShapes(camera, axis, e1, e2, midCenter, geometry.radius, geometry.halfThickness, RIM_SAMPLES);
    const nearCircle = wheel.nearCap;
    const faceNormal = wheel.capNormal;

    // ── Band ──────────────────────────────────────────────────────────────────
    this.bandPath.shape = wheel.band;
    this.bandPath.visible = wheel.band !== null;
    if (wheel.band !== null) {
      this.bandPath.fill = this.bandGradient(nearCircle, axis, e1, e2);
      this.bandPath.stroke = shadeColor(palette.body, 0.55);
      this.bandPath.lineWidth = 1;
    }

    // ── Visible face ──────────────────────────────────────────────────────────
    this.facePath.shape = wheel.cap;
    this.facePath.fill = this.faceGradient(nearCircle, faceNormal);

    // ── Painted quadrants ─────────────────────────────────────────────────────
    // Two opposite quadrants: at any tilt at least one of them stays in view, so
    // the spin never disappears the way a single radial spoke does.
    const quadrantSamples = Math.max(6, Math.round(RIM_SAMPLES / 4));
    this.sectorPath.shape = quadrantShape(nearCircle, psiDisplay, quadrantSamples);
    const markingShade = shadeFactor(faceNormal);
    this.sectorPath.fill = shadeColor(palette.marking, markingShade);
    // Fade the markings as the true spin outruns the drawn one. They never vanish
    // completely: the phase cap already removes the strobing, so what is left for the
    // fade to do is signal "much faster than this" without erasing the wheel.
    this.sectorPath.opacity = 0.9 * (1 - 0.55 * spinBlur);

    // ── Rotational blur ───────────────────────────────────────────────────────
    // Once the markings wash out the wheel would look stationary, so replace them
    // with smeared arcs — the way a fast wheel actually looks.
    if (spinBlur > 0.05) {
      const blur = new Shape();
      for (const [fraction, sweep] of [
        [0.36, 4.4],
        [0.62, 3.6],
        [0.86, 5.0],
      ] as const) {
        const ring = projectCircle(camera, wheel.nearCapCenter, e1, e2, geometry.radius * fraction);
        const points = circleArcPoints(ring, psiDisplay * 1.7 + fraction * 9, sweep, 28);
        blur.moveToPoint(points[0] as Vector2);
        for (let i = 1; i < points.length; i++) {
          blur.lineToPoint(points[i] as Vector2);
        }
      }
      this.blurPath.shape = blur;
      this.blurPath.fill = null;
      this.blurPath.stroke = shadeColor(palette.body, 1.5);
      this.blurPath.lineWidth = Math.max(1, geometry.radius * camera.pxPerM * 0.07);
      this.blurPath.lineCap = "round";
      this.blurPath.opacity = 0.32 * spinBlur;
      this.blurPath.visible = true;
    } else {
      this.blurPath.visible = false;
    }

    // ── Rim outline and studs ─────────────────────────────────────────────────
    this.rimPath.shape = wheel.cap;
    this.rimPath.fill = null;
    this.rimPath.stroke = shadeColor(palette.body, 1.55);
    this.rimPath.lineWidth = 2;

    // A machined groove concentric with the rim. Without it the shaded face reads as
    // a sphere; with it, unmistakably as the flat face of a disc.
    const groove = projectCircle(camera, wheel.nearCapCenter, e1, e2, geometry.radius * 0.68);
    this.groovePath.shape = Shape.polygon(circleArcPoints(groove, 0, 2 * Math.PI, 40));
    this.groovePath.fill = null;
    this.groovePath.stroke = shadeColor(palette.body, 0.62);
    this.groovePath.lineWidth = 1.5;

    const studs = new Shape();
    const studRadius = Math.max(1.5, geometry.radius * camera.pxPerM * 0.06);
    for (let i = 0; i < 4; i++) {
      const p = circlePoint(nearCircle, psiDisplay + (i * Math.PI) / 2);
      studs.moveTo(p.x + studRadius, p.y);
      studs.circle(p.x, p.y, studRadius);
    }
    this.studPath.shape = studs;
    this.studPath.fill = shadeColor(palette.marking, 1.35);
    this.studPath.opacity = 1 - 0.6 * spinBlur;

    // ── Hub ───────────────────────────────────────────────────────────────────
    const hubNear = projectCircle(camera, wheel.nearCapCenter, e1, e2, geometry.hubRadius);
    this.hubPath.shape = Shape.polygon(circleArcPoints(hubNear, 0, 2 * Math.PI, 24));
    this.hubPath.fill = shadeColor(palette.axle, shadeFactor(faceNormal, 0.55) * 1.1);
    this.hubPath.stroke = shadeColor(palette.axle, 0.6);
    this.hubPath.lineWidth = 1;

    // ── Axle, split at the wheel so one half is occluded ───────────────────────
    const pivotPoint = project(camera, Vector3.ZERO);
    const innerEnd = project(camera, axis.timesScalar(geometry.comDistance - geometry.halfThickness));
    const outerStart = project(camera, axis.timesScalar(geometry.comDistance + geometry.halfThickness));
    const outerEnd = project(camera, axis.timesScalar(geometry.axleLength));

    // Depth grows along +n̂ when axisDepth > 0, so the far side of the wheel is the
    // outer stub then, and the pivot stub otherwise.
    const outerIsBehind = axisDepth > 0;
    const axleWidth = Math.max(2, 2 * geometry.axleRadius * camera.pxPerM);

    const inner = new Shape().moveToPoint(pivotPoint).lineToPoint(innerEnd);
    const outer = new Shape().moveToPoint(outerStart).lineToPoint(outerEnd);

    this.axleBehind.shape = outerIsBehind ? outer : inner;
    this.axleFront.shape = outerIsBehind ? inner : outer;
    for (const [path, behind] of [
      [this.axleBehind, true],
      [this.axleFront, false],
    ] as const) {
      path.fill = null;
      path.stroke = shadeColor(palette.axle, behind ? 0.72 : 1.06);
      path.lineWidth = axleWidth;
      path.lineCap = "round";
    }

    // ── Ground shadow ─────────────────────────────────────────────────────────
    if (this.groundZ === null) {
      this.shadowPath.visible = false;
    } else {
      // Straight-down projection of the rim circle onto the ground plane: flatten
      // the two in-plane basis vectors and re-project them there.
      const flatten = (v: Vector3): Vector3 => new Vector3(v.x, v.y, 0);
      const shadowCenter = new Vector3(midCenter.x, midCenter.y, this.groundZ);
      const shadow = {
        center: project(this.camera, shadowCenter),
        a: projectDirection(camera, flatten(e1)).timesScalar(geometry.radius),
        b: projectDirection(camera, flatten(e2)).timesScalar(geometry.radius),
      };
      this.shadowPath.shape = Shape.polygon(circleArcPoints(shadow, 0, 2 * Math.PI, 32));
      this.shadowPath.fill = palette.shadow;
      this.shadowPath.visible = true;
    }
  }

  /**
   * Face fill: flat Lambert term for the face's own normal, plus a gentle gradient
   * across it so the disk reads as slightly domed rather than as cut paper.
   */
  private faceGradient(circle: { center: Vector2; a: Vector2; b: Vector2 }, normal: Vector3): LinearGradient | Color {
    const base = shadeColor(this.palette.body, shadeFactor(normal));
    const span = circle.a.magnitude > circle.b.magnitude ? circle.a : circle.b;
    if (span.magnitude < 1) {
      return base;
    }
    const from = circle.center.minus(span);
    const to = circle.center.plus(span);
    return new LinearGradient(from.x, from.y, to.x, to.y)
      .addColorStop(0, shadeColor(base, 1.12))
      .addColorStop(0.55, base)
      .addColorStop(1, shadeColor(base, 0.9));
  }

  /**
   * Band fill: the rim's outward normal sweeps the whole in-plane circle, so shade
   * it from the brightest rim point to the darkest one. The brightest normal is the
   * light direction projected into the wheel's plane.
   */
  private bandGradient(
    circle: { center: Vector2; a: Vector2; b: Vector2 },
    axis: Vector3,
    e1: Vector3,
    e2: Vector3,
  ): LinearGradient | Color {
    const base = shadeColor(this.palette.body, 0.8);
    const inPlane = TOWARD_LIGHT.minus(axis.timesScalar(TOWARD_LIGHT.dot(axis)));
    if (inPlane.magnitude < 1e-6) {
      return base;
    }
    const litAlpha = Math.atan2(inPlane.dot(e2), inPlane.dot(e1));
    const lit = circlePoint(circle, litAlpha);
    const dim = circlePoint(circle, litAlpha + Math.PI);
    if (lit.distance(dim) < 1) {
      return base;
    }
    return new LinearGradient(lit.x, lit.y, dim.x, dim.y)
      .addColorStop(0, shadeColor(base, 1.4))
      .addColorStop(1, shadeColor(base, 0.55));
  }
}

/** Two opposite quadrants as one shape, so they share a single fill. */
function quadrantShape(circle: { center: Vector2; a: Vector2; b: Vector2 }, psi: number, samples: number): Shape {
  const shape = new Shape();
  for (const offsetAngle of [0, Math.PI]) {
    const points = [circle.center, ...circleArcPoints(circle, psi + offsetAngle, Math.PI / 2, samples)];
    const first = points[0] as Vector2;
    shape.moveToPoint(first);
    for (let i = 1; i < points.length; i++) {
      shape.lineToPoint(points[i] as Vector2);
    }
    shape.close();
  }
  return shape;
}

/**
 * Ground ellipse at height z — the floor the scenes draw the apparatus standing on.
 */
export function groundEllipse(camera: Camera3D, z: number, radius: number): Shape {
  return Shape.polygon(circleArcPoints(projectHorizontalCircle(camera, z, radius), 0, 2 * Math.PI, 48));
}
