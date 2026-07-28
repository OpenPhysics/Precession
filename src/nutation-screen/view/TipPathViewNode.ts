/**
 * TipPathViewNode.ts
 *
 * The axle tip's path, seen straight down the vertical.
 *
 * On the sphere the same path is genuinely hard to read: cusps, loops and waves all
 * project to tangles of overlapping arcs, and the wheel keeps getting in the way.
 * Flattened onto the horizontal plane they separate completely, and the three release
 * modes become three unmistakable shapes — the scalloped edge of a cusped release,
 * the little retrograde loops of a backward push, the smooth ripple of a forward one.
 * This is the figure the textbooks draw, and it is worth its own panel.
 */

import { Multilink } from "scenerystack/axon";
import { Bounds2, Vector2 } from "scenerystack/dot";
import { Shape } from "scenerystack/kite";
import { Circle, Node, Path } from "scenerystack/scenery";
import RigidBodyPrecessionColors from "../../RigidBodyPrecessionColors.js";
import { NUTATION_MAX_TILT_RAD, NUTATION_TRACE_DRAW_SAMPLES } from "../../RigidBodyPrecessionConstants.js";
import type { NutationModel } from "../model/NutationModel.js";

export const TIP_PATH_VIEW_WIDTH = 215;
export const TIP_PATH_VIEW_HEIGHT = 300;

/** Radius of the sphere the tip moves on, matching the drawn axle in the 3-D scene. */
export const TIP_RADIUS_M = 0.78;

const CENTER = new Vector2(TIP_PATH_VIEW_WIDTH / 2, TIP_PATH_VIEW_HEIGHT / 2);
/** Scale chosen so the widest possible orbit — the axle horizontal — just fits. */
const PX_PER_M =
  (Math.min(TIP_PATH_VIEW_WIDTH, TIP_PATH_VIEW_HEIGHT) / 2 - 10) / (TIP_RADIUS_M * Math.sin(NUTATION_MAX_TILT_RAD));

/** Horizontal position of the tip, in view pixels, for a given tilt and azimuth. */
function tipPoint(theta: number, phi: number): Vector2 {
  const r = TIP_RADIUS_M * Math.sin(theta) * PX_PER_M;
  // Screen y runs down, so negate: this is the view from above, φ counterclockwise.
  return new Vector2(CENTER.x + r * Math.cos(phi), CENTER.y - r * Math.sin(phi));
}

function tiltRadius(theta: number): number {
  return Math.max(0.5, TIP_RADIUS_M * Math.sin(theta) * PX_PER_M);
}

/** Append a circle centered on the view, wound in the given direction. */
function appendRing(shape: Shape, radius: number, winding: 1 | -1): void {
  const samples = 64;
  for (let i = 0; i <= samples; i++) {
    const angle = (winding * (i / samples) * 2 * Math.PI) % (2 * Math.PI);
    const point = new Vector2(CENTER.x + radius * Math.cos(angle), CENTER.y + radius * Math.sin(angle));
    if (i === 0) {
      shape.moveToPoint(point);
    } else {
      shape.lineToPoint(point);
    }
  }
  shape.close();
}

export class TipPathViewNode extends Node {
  public constructor(model: NutationModel) {
    super();
    this.localBounds = new Bounds2(0, 0, TIP_PATH_VIEW_WIDTH, TIP_PATH_VIEW_HEIGHT);

    const crosshair = new Path(
      new Shape()
        .moveTo(CENTER.x - 7, CENTER.y)
        .lineTo(CENTER.x + 7, CENTER.y)
        .moveTo(CENTER.x, CENTER.y - 7)
        .lineTo(CENTER.x, CENTER.y + 7),
      { stroke: RigidBodyPrecessionColors.textColorProperty, lineWidth: 1, opacity: 0.4 },
    );

    /** The annulus between the two turning-point circles: the tip cannot leave it. */
    const bandFill = new Path(null, {
      fill: RigidBodyPrecessionColors.nutationBandColorProperty,
      opacity: 0.14,
    });
    const bandEdges = new Path(null, {
      stroke: RigidBodyPrecessionColors.nutationBandColorProperty,
      lineWidth: 1.2,
      lineDash: [5, 4],
      opacity: 0.9,
    });

    const path = new Path(null, {
      stroke: RigidBodyPrecessionColors.tipTraceColorProperty,
      lineWidth: 2,
      lineJoin: "round",
    });
    const tipDot = new Circle(4, { fill: RigidBodyPrecessionColors.tipTraceColorProperty });

    this.children = [bandFill, bandEdges, crosshair, path, tipDot];

    const update = (): void => {
      const band = model.nutationBandProperty.value;
      const innerR = tiltRadius(band.thetaMin);
      const outerR = tiltRadius(band.thetaMax);

      // Outer ring one way round, inner ring the other: under the default nonzero fill
      // rule that is an annulus, with no boolean geometry needed.
      const edges = new Shape();
      appendRing(edges, outerR, 1);
      appendRing(edges, innerR, -1);
      bandEdges.shape = edges;
      bandFill.shape = edges;

      const samples = model.getTraceSamples();
      const first = Math.max(0, samples.length - NUTATION_TRACE_DRAW_SAMPLES);
      if (samples.length - first > 1) {
        const shape = new Shape();
        let started = false;
        for (let i = first; i < samples.length; i++) {
          const sample = samples[i];
          if (!sample) {
            continue;
          }
          const point = tipPoint(sample.theta, sample.phi);
          if (started) {
            shape.lineToPoint(point);
          } else {
            shape.moveToPoint(point);
            started = true;
          }
        }
        path.shape = shape;
      } else {
        path.shape = null;
      }

      tipDot.center = tipPoint(model.thetaProperty.value, model.phiProperty.value);
    };

    Multilink.multilink([model.thetaProperty, model.phiProperty], update);
    update();
  }
}
