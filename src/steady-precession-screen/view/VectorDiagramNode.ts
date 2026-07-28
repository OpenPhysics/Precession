/**
 * VectorDiagramNode.ts
 *
 * The one figure Screen 1 exists to teach: L, the little kick τΔt that gravity adds
 * to it, and the L that results.
 *
 * Drawn with the same `Camera3D` as the apparatus beside it, so the tilt, the sense
 * of rotation, and the foreshortening all match — the diagram is the gyroscope with
 * everything but the vectors erased, not a separate schematic that has to be
 * reconciled with it.
 *
 * The trick that makes the result feel inevitable: τ is horizontal and perpendicular
 * to L, so adding τΔt to L cannot lengthen it or lower it. It can only swing it
 * around the vertical. The tip has nowhere to go but sideways.
 */

import { Multilink } from "scenerystack/axon";
import { Bounds2, Vector2, Vector3 } from "scenerystack/dot";
import { Shape } from "scenerystack/kite";
import { Circle, Line, Node, Path, RichText, Text, VBox } from "scenerystack/scenery";
import { ArrowNode, PhetFont } from "scenerystack/scenery-phet";
import {
  type Camera3D,
  circleArcPoints,
  createCamera,
  project,
  projectHorizontalCircle,
  symmetryAxis,
} from "../../common/view/Camera3D.js";
import { StringManager } from "../../i18n/StringManager.js";
import RigidBodyPrecessionColors from "../../RigidBodyPrecessionColors.js";
import type { SteadyPrecessionModel } from "../model/SteadyPrecessionModel.js";

export const VECTOR_DIAGRAM_WIDTH = 182;
export const VECTOR_DIAGRAM_HEIGHT = 262;

/** Lengths are in units of |L|, so the camera's "meter" is one angular momentum. */
const CAMERA: Camera3D = createCamera(new Vector2(91, 172), 76, 20);

/** Where along L the weight is shown acting — a stand-in for the center of mass. */
const COM_FRACTION = 0.55;

/**
 * Angle the ghost L is advanced by. Large enough that ΔL is a visible arrow rather
 * than a rounding error, small enough that the chord still reads as ⊥ L.
 */
const GHOST_ADVANCE_RAD = (26 * Math.PI) / 180;

const LABEL_FONT = new PhetFont({ size: 13, weight: "bold" });
const SMALL_LABEL_FONT = new PhetFont({ size: 11, weight: "bold" });
const LEGEND_FONT = new PhetFont({ size: 10 });
const INSIGHT_FONT = new PhetFont({ size: 11 });
const ARROW = { headHeight: 9, headWidth: 9, tailWidth: 2.5 } as const;

function legendRow(color: typeof RigidBodyPrecessionColors.weightColorProperty, label: string): Node {
  return new Node({
    children: [
      new Line(0, 0, 13, 0, { stroke: color, lineWidth: 3, centerY: 0 }),
      new Text(label, { font: LEGEND_FONT, fill: color, left: 17, centerY: 0 }),
    ],
  });
}

/** Small right-angle bracket between two directions meeting at `corner`. */
function rightAngleShape(corner: Vector2, alongA: Vector2, alongB: Vector2, size: number): Shape {
  const a = alongA.normalized().times(size);
  const b = alongB.normalized().times(size);
  return new Shape().moveToPoint(corner.plus(a)).lineToPoint(corner.plus(a).plus(b)).lineToPoint(corner.plus(b));
}

export class VectorDiagramNode extends Node {
  public constructor(model: SteadyPrecessionModel) {
    super();
    this.localBounds = new Bounds2(0, 0, VECTOR_DIAGRAM_WIDTH, VECTOR_DIAGRAM_HEIGHT);

    const strings = StringManager.getInstance().getSteadyPrecessionStrings();
    const origin = project(CAMERA, Vector3.ZERO);

    const insight = new RichText(strings.vectorInsightStringProperty, {
      font: INSIGHT_FONT,
      fill: RigidBodyPrecessionColors.textColorProperty,
      left: 4,
      top: 2,
      maxWidth: VECTOR_DIAGRAM_WIDTH - 8,
      lineWrap: VECTOR_DIAGRAM_WIDTH - 8,
    });

    const verticalAxis = new Line(origin.x, origin.y - 96, origin.x, origin.y + 44, {
      stroke: RigidBodyPrecessionColors.textColorProperty,
      lineWidth: 1,
      lineDash: [3, 4],
      opacity: 0.4,
    });

    /** The horizontal circle the tip of L is confined to. */
    const tipOrbit = new Path(null, {
      stroke: RigidBodyPrecessionColors.precessionColorProperty,
      lineWidth: 1,
      lineDash: [3, 3],
      opacity: 0.55,
    });

    const ghostArrow = new ArrowNode(0, 0, 0, 0, {
      ...ARROW,
      tailWidth: 1.5,
      fill: RigidBodyPrecessionColors.angularMomentumColorProperty,
      stroke: RigidBodyPrecessionColors.angularMomentumColorProperty,
      opacity: 0.4,
    });
    const momentumArrow = new ArrowNode(0, 0, 0, 0, {
      ...ARROW,
      fill: RigidBodyPrecessionColors.angularMomentumColorProperty,
      stroke: RigidBodyPrecessionColors.angularMomentumColorProperty,
    });
    const deltaArrow = new ArrowNode(0, 0, 0, 0, {
      ...ARROW,
      fill: RigidBodyPrecessionColors.torqueColorProperty,
      stroke: RigidBodyPrecessionColors.torqueColorProperty,
    });
    const weightArrow = new ArrowNode(0, 0, 0, 0, {
      ...ARROW,
      fill: RigidBodyPrecessionColors.weightColorProperty,
      stroke: RigidBodyPrecessionColors.weightColorProperty,
    });
    const precessionArrow = new ArrowNode(0, 0, 0, 0, {
      ...ARROW,
      fill: RigidBodyPrecessionColors.precessionColorProperty,
      stroke: RigidBodyPrecessionColors.precessionColorProperty,
    });

    const rightAngle = new Path(null, {
      stroke: RigidBodyPrecessionColors.textColorProperty,
      lineWidth: 1,
      opacity: 0.6,
    });

    const momentumLabel = new Text("L", {
      font: LABEL_FONT,
      fill: RigidBodyPrecessionColors.angularMomentumColorProperty,
    });
    const deltaLabel = new Text("τΔt", {
      font: SMALL_LABEL_FONT,
      fill: RigidBodyPrecessionColors.torqueColorProperty,
    });
    const weightLabel = new Text("mg", { font: LABEL_FONT, fill: RigidBodyPrecessionColors.weightColorProperty });
    const precessionLabel = new Text("Ω", {
      font: LABEL_FONT,
      fill: RigidBodyPrecessionColors.precessionColorProperty,
    });

    const pivotDot = new Circle(4, { fill: RigidBodyPrecessionColors.accentColorProperty, center: origin });

    const noTorqueMessage = new RichText(strings.noTorqueMessageStringProperty, {
      font: INSIGHT_FONT,
      fill: RigidBodyPrecessionColors.textColorProperty,
      centerX: VECTOR_DIAGRAM_WIDTH / 2,
      centerY: origin.y,
      maxWidth: VECTOR_DIAGRAM_WIDTH - 20,
      lineWrap: VECTOR_DIAGRAM_WIDTH - 20,
      visible: false,
    });

    const legend = new VBox({
      spacing: 3,
      align: "left",
      children: [
        legendRow(RigidBodyPrecessionColors.angularMomentumColorProperty, "L = I₃ω"),
        legendRow(RigidBodyPrecessionColors.torqueColorProperty, "τΔt ⊥ L"),
        legendRow(RigidBodyPrecessionColors.weightColorProperty, "mg"),
        legendRow(RigidBodyPrecessionColors.precessionColorProperty, "Ω"),
      ],
      left: 6,
      bottom: VECTOR_DIAGRAM_HEIGHT - 4,
    });

    const construction = new Node({
      children: [
        verticalAxis,
        tipOrbit,
        ghostArrow,
        momentumArrow,
        deltaArrow,
        rightAngle,
        weightArrow,
        precessionArrow,
        pivotDot,
        momentumLabel,
        deltaLabel,
        weightLabel,
        precessionLabel,
      ],
    });

    this.children = [insight, construction, noTorqueMessage, legend];

    const update = (): void => {
      const atCom = model.pivotAtCenterOfMassProperty.value;
      construction.visible = !atCom;
      noTorqueMessage.visible = atCom;
      if (atCom) {
        return;
      }

      const tilt = model.tiltAngleProperty.value;
      const phi = model.precessionAngleProperty.value;

      const tip3 = symmetryAxis(tilt, phi);
      const ghost3 = symmetryAxis(tilt, phi + GHOST_ADVANCE_RAD);
      const tip = project(CAMERA, tip3);
      const ghost = project(CAMERA, ghost3);

      momentumArrow.setTailAndTip(origin.x, origin.y, tip.x, tip.y);
      ghostArrow.setTailAndTip(origin.x, origin.y, ghost.x, ghost.y);
      deltaArrow.setTailAndTip(tip.x, tip.y, ghost.x, ghost.y);

      const orbit = projectHorizontalCircle(CAMERA, Math.cos(tilt), Math.sin(tilt));
      tipOrbit.shape = Shape.polygon(circleArcPoints(orbit, 0, 2 * Math.PI, 48));

      // The chord τΔt leaves L's length and height untouched, which is the point —
      // mark the right angle that guarantees it.
      const alongL = tip.minus(origin);
      const alongDelta = ghost.minus(tip);
      rightAngle.shape =
        alongDelta.magnitude > 2 && alongL.magnitude > 2 ? rightAngleShape(tip, alongL.negated(), alongDelta, 9) : null;

      momentumLabel.centerX = origin.x + alongL.x * 0.55 - 12 * Math.sign(alongL.x || 1);
      momentumLabel.centerY = origin.y + alongL.y * 0.55;

      const deltaMid = tip.average(ghost);
      deltaLabel.centerX = deltaMid.x + (deltaMid.x >= origin.x ? 20 : -20);
      deltaLabel.centerY = deltaMid.y - 10;

      const comPoint = project(CAMERA, tip3.timesScalar(COM_FRACTION));
      weightArrow.setTailAndTip(comPoint.x, comPoint.y, comPoint.x, comPoint.y + 38);
      weightLabel.left = comPoint.x + 5;
      weightLabel.top = comPoint.y + 20;

      precessionArrow.setTailAndTip(origin.x, origin.y, origin.x, origin.y - 40);
      precessionLabel.right = origin.x - 5;
      precessionLabel.centerY = origin.y - 34;
    };

    Multilink.multilink(
      [
        model.precessionAngleProperty,
        model.tiltAngleProperty,
        model.pivotAtCenterOfMassProperty,
        model.armMassProperty,
      ],
      update,
    );
    update();
  }
}
