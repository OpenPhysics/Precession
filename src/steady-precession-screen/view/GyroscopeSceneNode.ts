/**
 * GyroscopeSceneNode.ts
 *
 * The lecture-hall gyroscope in three dimensions: a heavy wheel on a rod resting in
 * a pivot, a sliding counterweight, and the four vectors that explain what it does.
 *
 * Everything here is drawn through the shared `Camera3D`, so the wheel, the floor
 * grid, the tip's orbit and the vectors all agree about where "away from you" is.
 * The pieces are ordered back-to-front by their computed depth rather than by a
 * fixed guess, which is what lets the rod visibly pass *behind* the wheel on the far
 * half of each precession cycle and in front of it on the near half — the cue that
 * turns an ambiguous ellipse into an object.
 */

import { Multilink } from "scenerystack/axon";
import { Bounds2, Vector2, Vector3 } from "scenerystack/dot";
import { Shape } from "scenerystack/kite";
import { Circle, Node, Path, Rectangle, Text } from "scenerystack/scenery";
import { ArrowNode, PhetFont } from "scenerystack/scenery-phet";
import {
  axisFrame,
  type Camera3D,
  circleArcPoints,
  createCamera,
  depth,
  project,
  projectDirection,
  projectHorizontalCircle,
  shadeColor,
  symmetryAxis,
} from "../../common/view/Camera3D.js";
import { cylinderShapes } from "../../common/view/CylinderShapes.js";
import { GyroStageNode } from "../../common/view/GyroStageNode.js";
import { SpinningWheelNode, type WheelGeometry } from "../../common/view/SpinningWheelNode.js";
import { SpinPhaseTracker, spinBlurFor } from "../../common/view/SpinPhase.js";
import { StringManager } from "../../i18n/StringManager.js";
import RigidBodyPrecessionColors from "../../RigidBodyPrecessionColors.js";
import {
  ARM_MASS_RANGE,
  DISK_HALF_THICKNESS_M,
  DISK_POSITION_FROM_PIVOT_M,
  DISK_RADIUS_M,
  PIVOT_DISTANCE_RANGE,
  SPIN_RATE_RANGE,
} from "../../RigidBodyPrecessionConstants.js";
import type { SteadyPrecessionModel } from "../model/SteadyPrecessionModel.js";

export const GYROSCOPE_SCENE_WIDTH = 400;
export const GYROSCOPE_SCENE_HEIGHT = 262;

// Framed so that nothing clips at the extremes of the tilt and distance sliders:
// the rod tip at the shallowest tilt sets the top, the floor disc sets the bottom.
const CAMERA: Camera3D = createCamera(new Vector2(152, 158), 182, 24);

/** Height of the pivot above the floor (m). */
const STAND_HEIGHT_M = 0.38;
/** Radius of the drawn floor disc (m). */
const GROUND_RADIUS_M = 0.45;

/**
 * The rod is a fixed length with the counterweight sliding on it, so the tip traces
 * one orbit of constant radius no matter where the weight sits.
 */
const ROD_LENGTH_M = PIVOT_DISTANCE_RANGE.max + 0.05;

const WHEEL_GEOMETRY: WheelGeometry = {
  radius: DISK_RADIUS_M,
  halfThickness: DISK_HALF_THICKNESS_M,
  hubRadius: 0.038,
  comDistance: DISK_POSITION_FROM_PIVOT_M,
  axleLength: ROD_LENGTH_M,
  axleRadius: 0.016,
};

const COLLAR_RADIUS_M = 0.055;
const COLLAR_HALF_LENGTH_M = 0.045;

const LABEL_FONT = new PhetFont({ size: 12, weight: "bold" });
const SMALL_FONT = new PhetFont({ size: 10 });
const ARROW = { headHeight: 10, headWidth: 9, tailWidth: 3 } as const;

/** Screen-space length of a vector arrow, mapped from a value onto a legible band. */
function arrowLength(value: number, max: number, minPx: number, maxPx: number): number {
  const t = max <= 0 ? 0 : Math.min(1, Math.max(0, value / max));
  return minPx + (maxPx - minPx) * Math.sqrt(t);
}

/** Polyline of a horizontal circle over an angular window, as a Shape. */
function horizontalArc(camera: Camera3D, z: number, radius: number, from: number, sweep: number, samples = 48): Shape {
  const circle = projectHorizontalCircle(camera, z, radius);
  const points = circleArcPoints(circle, from, sweep, samples);
  const shape = new Shape();
  shape.moveToPoint(points[0] as Vector2);
  for (let i = 1; i < points.length; i++) {
    shape.lineToPoint(points[i] as Vector2);
  }
  return shape;
}

export class GyroscopeSceneNode extends Node {
  private readonly spinPhase = new SpinPhaseTracker();

  public constructor(model: SteadyPrecessionModel) {
    super();
    this.localBounds = new Bounds2(0, 0, GYROSCOPE_SCENE_WIDTH, GYROSCOPE_SCENE_HEIGHT);

    const stage = new GyroStageNode(CAMERA, {
      standHeight: STAND_HEIGHT_M,
      groundRadius: GROUND_RADIUS_M,
      verticalExtent: ROD_LENGTH_M + 0.04,
    });

    // The tip's orbit is split at its silhouette so the apparatus sits inside it.
    const orbitFar = new Path(null, {
      stroke: RigidBodyPrecessionColors.precessionColorProperty,
      lineWidth: 1.5,
      lineDash: [5, 4],
      opacity: 0.45,
    });
    const orbitNear = new Path(null, {
      stroke: RigidBodyPrecessionColors.precessionColorProperty,
      lineWidth: 1.5,
      lineDash: [5, 4],
      opacity: 0.8,
    });
    /** Short bright trail behind the tip — the clearest read on which way it is going. */
    const orbitTrail = new Path(null, {
      stroke: RigidBodyPrecessionColors.precessionColorProperty,
      lineWidth: 3,
      lineCap: "round",
      opacity: 0.85,
    });

    const tiltArc = new Path(null, {
      stroke: RigidBodyPrecessionColors.textColorProperty,
      lineWidth: 1.2,
      opacity: 0.7,
    });
    const tiltLabel = new Text("θ", { font: LABEL_FONT, fill: RigidBodyPrecessionColors.textColorProperty });

    const wheel = new SpinningWheelNode(CAMERA, WHEEL_GEOMETRY, this.palette(), { groundZ: -STAND_HEIGHT_M });

    const collarBand = new Path(null);
    const collarCap = new Path(null);
    const collar = new Node({ children: [collarBand, collarCap] });
    /** Two slots the collar hops between, depending on which side of the wheel it is on. */
    const collarBehindSlot = new Node();
    const collarFrontSlot = new Node();

    const pivotDot = new Circle(5, {
      fill: RigidBodyPrecessionColors.accentColorProperty,
      stroke: RigidBodyPrecessionColors.textColorProperty,
      lineWidth: 1,
      center: project(CAMERA, Vector3.ZERO),
    });

    /** Straight-down line from the wheel's center to the floor — a height reference. */
    const plumb = new Path(null, {
      stroke: RigidBodyPrecessionColors.textColorProperty,
      lineWidth: 1,
      lineDash: [2, 4],
      opacity: 0.35,
    });

    const momentumArrow = new ArrowNode(0, 0, 0, 0, {
      ...ARROW,
      fill: RigidBodyPrecessionColors.angularMomentumColorProperty,
      stroke: RigidBodyPrecessionColors.angularMomentumColorProperty,
    });
    const weightArrow = new ArrowNode(0, 0, 0, 0, {
      ...ARROW,
      fill: RigidBodyPrecessionColors.weightColorProperty,
      stroke: RigidBodyPrecessionColors.weightColorProperty,
    });
    const torqueArrow = new ArrowNode(0, 0, 0, 0, {
      ...ARROW,
      fill: RigidBodyPrecessionColors.torqueColorProperty,
      stroke: RigidBodyPrecessionColors.torqueColorProperty,
    });
    const precessionArrow = new ArrowNode(0, 0, 0, 0, {
      ...ARROW,
      fill: RigidBodyPrecessionColors.precessionColorProperty,
      stroke: RigidBodyPrecessionColors.precessionColorProperty,
    });

    const momentumLabel = new Text("L", {
      font: LABEL_FONT,
      fill: RigidBodyPrecessionColors.angularMomentumColorProperty,
    });
    const weightLabel = new Text("mg", { font: LABEL_FONT, fill: RigidBodyPrecessionColors.weightColorProperty });
    const torqueLabel = new Text("τ", { font: LABEL_FONT, fill: RigidBodyPrecessionColors.torqueColorProperty });
    const precessionLabel = new Text("Ω", {
      font: LABEL_FONT,
      fill: RigidBodyPrecessionColors.precessionColorProperty,
    });

    const tipDot = new Circle(4.5, {
      fill: RigidBodyPrecessionColors.precessionColorProperty,
      stroke: RigidBodyPrecessionColors.backgroundColorProperty,
      lineWidth: 1,
    });

    // The wheel's drawn spin is rate-capped so it does not strobe, which means the
    // animation understates ω. Say so rather than let the picture mislead.
    const slowedNote = new Text(StringManager.getInstance().getSteadyPrecessionStrings().spinSlowedStringProperty, {
      font: SMALL_FONT,
      fill: RigidBodyPrecessionColors.textColorProperty,
      opacity: 0.65,
      left: 4,
      bottom: GYROSCOPE_SCENE_HEIGHT - 2,
      maxWidth: GYROSCOPE_SCENE_WIDTH - 110,
    });

    // ── Top-down inset ────────────────────────────────────────────────────────
    const inset = this.createInset();

    this.children = [
      stage,
      orbitFar,
      collarBehindSlot,
      wheel,
      collarFrontSlot,
      plumb,
      tiltArc,
      tiltLabel,
      pivotDot,
      momentumArrow,
      momentumLabel,
      weightArrow,
      weightLabel,
      torqueArrow,
      torqueLabel,
      precessionArrow,
      precessionLabel,
      orbitNear,
      orbitTrail,
      tipDot,
      slowedNote,
      inset.node,
    ];
    collarFrontSlot.addChild(collar);

    const update = (): void => {
      const tilt = model.tiltAngleProperty.value;
      const phi = model.precessionAngleProperty.value;
      const atCom = model.pivotAtCenterOfMassProperty.value;
      const spinRate = model.actualSpinRateProperty.value;
      const precessionRate = model.predictedPrecessionRateProperty.value;
      const precessing = !atCom && precessionRate > 1e-6;
      const massDistance = model.pivotToMassDistanceProperty.value;

      const axis = symmetryAxis(tilt, phi);
      const { e1, e2 } = axisFrame(tilt, phi);
      const outerIsBehind = depth(CAMERA, axis) > 0;

      // ── Wheel ───────────────────────────────────────────────────────────────
      const spinBlur = spinBlurFor(spinRate);
      wheel.update({
        theta: tilt,
        phi,
        psiDisplay: this.spinPhase.phaseAt(model.timer.timeProperty.value, spinRate),
        spinBlur,
      });
      slowedNote.visible = spinBlur > 0.2;

      // ── Counterweight collar ────────────────────────────────────────────────
      // Hidden when the pivot is moved to the center of mass: there is no weight
      // out on the rod in that configuration, which is why the torque vanishes.
      collar.visible = !atCom;
      if (!atCom) {
        const collarShapes = cylinderShapes(
          CAMERA,
          axis,
          e1,
          e2,
          axis.timesScalar(massDistance),
          COLLAR_RADIUS_M,
          COLLAR_HALF_LENGTH_M,
          32,
        );
        const weightColor = RigidBodyPrecessionColors.weightColorProperty.value;
        collarBand.shape = collarShapes.band;
        collarBand.fill = shadeColor(weightColor, 0.8);
        collarBand.stroke = shadeColor(weightColor, 0.5);
        collarBand.lineWidth = 1;
        collarCap.shape = collarShapes.cap;
        collarCap.fill = shadeColor(weightColor, 1.1);
        collarCap.stroke = shadeColor(weightColor, 0.6);
        collarCap.lineWidth = 1;
      }
      const collarSlot = outerIsBehind ? collarBehindSlot : collarFrontSlot;
      if (collar.parents[0] !== collarSlot) {
        collar.parents[0]?.removeChild(collar);
        collarSlot.addChild(collar);
      }

      // ── Orbit of the rod tip ────────────────────────────────────────────────
      const orbitRadius = ROD_LENGTH_M * Math.sin(tilt);
      const orbitZ = ROD_LENGTH_M * Math.cos(tilt);
      // Depth of a point on a horizontal circle is y·cos e − z·sin e with y = R sin α,
      // so the far half is exactly α ∈ (0, π).
      orbitFar.shape = horizontalArc(CAMERA, orbitZ, orbitRadius, 0, Math.PI);
      orbitNear.shape = horizontalArc(CAMERA, orbitZ, orbitRadius, Math.PI, Math.PI);
      orbitFar.visible = precessing;
      orbitNear.visible = precessing;
      orbitTrail.visible = precessing;
      tipDot.visible = precessing;
      if (precessing) {
        orbitTrail.shape = horizontalArc(CAMERA, orbitZ, orbitRadius, phi - 1.0, 1.0, 20);
      }

      const tipPoint = project(CAMERA, axis.timesScalar(ROD_LENGTH_M));
      tipDot.center = tipPoint;

      // ── Plumb line from the wheel center to the floor ───────────────────────
      const wheelCenter = axis.timesScalar(DISK_POSITION_FROM_PIVOT_M);
      plumb.shape = new Shape()
        .moveToPoint(project(CAMERA, wheelCenter))
        .lineToPoint(project(CAMERA, new Vector3(wheelCenter.x, wheelCenter.y, -STAND_HEIGHT_M)));

      // ── Tilt arc between the vertical and the rod ───────────────────────────
      // Wide enough that its label clears the Ω arrow standing on the same vertical.
      const arcRadius = 0.4;
      const arcShape = new Shape();
      const arcSamples = 24;
      for (let i = 0; i <= arcSamples; i++) {
        const t = (tilt * i) / arcSamples;
        const p = project(CAMERA, symmetryAxis(t, phi).timesScalar(arcRadius));
        if (i === 0) {
          arcShape.moveToPoint(p);
        } else {
          arcShape.lineToPoint(p);
        }
      }
      tiltArc.shape = arcShape;
      tiltLabel.center = project(CAMERA, symmetryAxis(tilt / 2, phi).timesScalar(arcRadius + 0.07));

      // ── Vectors ─────────────────────────────────────────────────────────────
      const pivotPoint = project(CAMERA, Vector3.ZERO);

      // L along the rod, length growing with spin. It has to reach past the wheel or
      // the disk swallows it, but stay inside the rod so it still reads as "along the
      // axle" rather than as a separate object.
      const rodScreenLength = tipPoint.distance(pivotPoint);
      const axisScreen = projectDirection(CAMERA, axis).normalized();
      const lPixels = Math.min(rodScreenLength * 0.94, arrowLength(spinRate, SPIN_RATE_RANGE.max, 88, 142));
      const lTip = pivotPoint.plus(axisScreen.timesScalar(lPixels));
      momentumArrow.setTailAndTip(pivotPoint.x, pivotPoint.y, lTip.x, lTip.y);
      momentumLabel.centerX = lTip.x - 12 * Math.sign(axisScreen.x || 1);
      momentumLabel.centerY = lTip.y - 11;

      // mg at the counterweight, straight down.
      weightArrow.visible = !atCom;
      weightLabel.visible = !atCom;
      if (!atCom) {
        const collarPoint = project(CAMERA, axis.timesScalar(massDistance));
        const mgPixels = arrowLength(model.armMassProperty.value, ARM_MASS_RANGE.max, 26, 52);
        weightArrow.setTailAndTip(collarPoint.x, collarPoint.y, collarPoint.x, collarPoint.y + mgPixels);
        weightLabel.left = collarPoint.x + 7;
        weightLabel.centerY = collarPoint.y + mgPixels * 0.6;
      }

      // τ at the rod tip, horizontal and tangent to the orbit — the direction the
      // tip is pushed, and the whole answer to "why sideways".
      torqueArrow.visible = precessing;
      torqueLabel.visible = precessing;
      if (precessing) {
        const tangent = projectDirection(CAMERA, new Vector3(-Math.sin(phi), Math.cos(phi), 0)).normalized();
        const tauPixels = arrowLength(model.getVectors().torqueMagnitude, 10, 26, 52);
        const tauTip = tipPoint.plus(tangent.timesScalar(tauPixels));
        torqueArrow.setTailAndTip(tipPoint.x, tipPoint.y, tauTip.x, tauTip.y);
        torqueLabel.centerX = tauTip.x + 9 * Math.sign(tangent.x || 1);
        torqueLabel.centerY = tauTip.y - 9;
      }

      // Ω on the vertical at the pivot.
      precessionArrow.visible = precessing;
      precessionLabel.visible = precessing;
      if (precessing) {
        const omegaPixels = arrowLength(precessionRate, 4, 30, 58);
        precessionArrow.setTailAndTip(pivotPoint.x, pivotPoint.y, pivotPoint.x, pivotPoint.y - omegaPixels);
        precessionLabel.right = pivotPoint.x - 7;
        precessionLabel.centerY = pivotPoint.y - omegaPixels - 2;
      }

      inset.update(phi, precessing);
    };

    Multilink.multilink(
      [
        model.timer.timeProperty,
        model.precessionAngleProperty,
        model.tiltAngleProperty,
        model.pivotToMassDistanceProperty,
        model.pivotAtCenterOfMassProperty,
        model.armMassProperty,
        model.predictedPrecessionRateProperty,
      ],
      update,
    );

    // The wheel's shading is baked from palette values, so redraw on theme change.
    Multilink.multilink(
      [
        RigidBodyPrecessionColors.wheelBodyColorProperty,
        RigidBodyPrecessionColors.wheelMarkingColorProperty,
        RigidBodyPrecessionColors.gyroscopeColorProperty,
        RigidBodyPrecessionColors.sceneShadowColorProperty,
      ],
      () => {
        wheel.setPalette(this.palette());
        update();
      },
    );

    update();
  }

  private palette() {
    return {
      body: RigidBodyPrecessionColors.wheelBodyColorProperty.value,
      marking: RigidBodyPrecessionColors.wheelMarkingColorProperty.value,
      axle: RigidBodyPrecessionColors.gyroscopeColorProperty.value,
      shadow: RigidBodyPrecessionColors.sceneShadowColorProperty.value,
    };
  }

  /**
   * Overhead view of the precession circle. Seen from above the motion is a plain
   * uniform rotation, which is exactly the claim Ω = τ/(I ω) makes — the side view
   * makes that hard to believe, so show it directly.
   */
  private createInset(): { node: Node; update: (phi: number, visible: boolean) => void } {
    const size = 92;
    const x = GYROSCOPE_SCENE_WIDTH - size - 2;
    const y = 4;
    const center = new Vector2(x + size / 2, y + size / 2 + 5);
    const radius = size / 2 - 13;

    const card = new Rectangle(x, y, size, size, {
      fill: RigidBodyPrecessionColors.sceneInsetCardColorProperty,
      stroke: RigidBodyPrecessionColors.panelBorderColorProperty,
      lineWidth: 1,
      cornerRadius: 6,
    });
    const orbit = new Circle(radius, {
      stroke: RigidBodyPrecessionColors.precessionColorProperty,
      lineWidth: 1,
      lineDash: [3, 3],
      center,
    });
    /** The angle φ swept since t = 0, filled in — precession as an accumulating angle. */
    const sweep = new Path(null, { fill: RigidBodyPrecessionColors.precessionColorProperty, opacity: 0.22 });
    const radial = new Path(null, {
      stroke: RigidBodyPrecessionColors.gyroscopeColorProperty,
      lineWidth: 1.5,
    });
    const zeroMark = new Path(new Shape().moveToPoint(center).lineToPoint(center.plusXY(radius, 0)), {
      stroke: RigidBodyPrecessionColors.textColorProperty,
      lineWidth: 1,
      lineDash: [2, 3],
      opacity: 0.5,
    });
    const dot = new Circle(4, { fill: RigidBodyPrecessionColors.precessionColorProperty });
    const label = new Text("from above", {
      font: SMALL_FONT,
      fill: RigidBodyPrecessionColors.textColorProperty,
      centerX: center.x,
      top: y + 3,
      opacity: 0.75,
    });

    const node = new Node({ children: [card, sweep, zeroMark, orbit, radial, dot, label] });

    const update = (phi: number, visible: boolean): void => {
      orbit.visible = visible;
      sweep.visible = visible;
      radial.visible = visible;
      dot.visible = visible;
      if (!visible) {
        return;
      }
      const p = center.plusXY(radius * Math.cos(phi), radius * Math.sin(phi));
      dot.center = p;
      radial.shape = new Shape().moveToPoint(center).lineToPoint(p);
      // The wedge fills up over each turn and resets, so it reads as a repeating
      // sweep rather than saturating into a solid disc after the first revolution.
      const swept = phi % (2 * Math.PI);
      sweep.shape =
        swept > 1e-3 ? new Shape().moveToPoint(center).arc(center.x, center.y, radius, 0, swept, false).close() : null;
    };

    return { node, update };
  }
}
