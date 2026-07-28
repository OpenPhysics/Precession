/**
 * RigidBodyPrecessionConstants.ts
 *
 * Central repository for every named numeric constant used across the simulation.
 */

import RigidBodyPrecessionNamespace from "./RigidBodyPrecessionNamespace.js";

// ── Layout / chrome (screen pixels) ───────────────────────────────────────────

/** Margin between the screen edge and edge-anchored controls (e.g. Reset All). */
export const SCREEN_VIEW_MARGIN = 20;

/** Corner radius shared by control panels and dialogs. */
export const PANEL_CORNER_RADIUS = 6;

/** Width of the control panel on the steady-precession screen. */
export const STEADY_PRECESSION_PANEL_WIDTH = 300;

/** Height of the precession-angle graph. */
export const PRECESSION_GRAPH_HEIGHT = 118;

/** Width of the control panel on the nutation screen. */
export const NUTATION_PANEL_WIDTH = 300;

/** Height of the nutation-angle graph. */
export const NUTATION_GRAPH_HEIGHT = 100;

// ── Physics defaults (SI units) ───────────────────────────────────────────────

/** Gravitational acceleration (m/s²). */
export const GRAVITY_MPS2 = 9.81;

// Screen 1's apparatus is the lecture-hall gyroscope: a heavy wheel on a horizontal
// axle resting in a gimbal, with a sliding counterweight. Its size matters
// pedagogically — a toy-sized disk spun at any believable rate has so little angular
// momentum that Ω = Mgl/(I₃ω) comes out at several turns per second, which is both
// unwatchable and outside the fast-top regime the formula assumes. This wheel
// precesses in a few seconds while still keeping Ω/ω near 1/30.

/** Mass of the spinning wheel (kg). */
export const DISK_MASS_KG = 3.0;

/** Rim radius of the spinning wheel (m). */
export const DISK_RADIUS_M = 0.25;

/** Half of the wheel's axial thickness (m) — drawn, and small enough to ignore in I₃. */
export const DISK_HALF_THICKNESS_M = 0.03;

/** Wheel moment of inertia about its spin axis, ½MR² for a solid disk (kg·m²). */
export const DISK_INERTIA_KG_M2 = 0.5 * DISK_MASS_KG * DISK_RADIUS_M ** 2;

/**
 * Distance from pivot to wheel center along the axle (m). Comfortably larger than
 * the wheel's radius, so the wheel hangs out on the rod instead of swallowing the
 * pivot and colliding with the stand.
 */
export const DISK_POSITION_FROM_PIVOT_M = 0.3;

/** Default tilt of the axle from vertical (rad) — 45°. */
export const DEFAULT_TILT_ANGLE_RAD = Math.PI / 4;

/** Time constant for spin-up toward the target spin rate (s). */
export const SPIN_UP_TIME_CONSTANT_S = 1.5;

/** Number of graph samples retained in the rolling buffer. */
export const PRECESSION_GRAPH_CAPACITY = 600;

/** Default target spin rate (rad/s) — 8 rev/s. */
export const DEFAULT_SPIN_RATE_RAD_S = 8 * 2 * Math.PI;

/** Default counterweight mass (kg). */
export const DEFAULT_ARM_MASS_KG = 0.4;

/** Default pivot-to-mass distance (m). */
export const DEFAULT_PIVOT_TO_MASS_DISTANCE_M = 0.58;

// ── Nutation screen: heavy symmetric top (SI units) ───────────────────────────
//
// A pivoted gyroscope wheel, sized so both timescales are watchable. The product
// ω_nut · Ω_slow = M g l / I₁ is fixed by the apparatus alone, so a hand-sized top
// (which nutates at several hertz) cannot show both motions at once; this wheel is
// the classroom demonstration gyroscope, heavy and slow enough that nutation runs
// near 1.6 Hz while one precession revolution takes about 3 s.

/** Mass of the gyroscope wheel (kg). */
export const NUTATION_WHEEL_MASS_KG = 3.0;

/** Rim radius of the gyroscope wheel (m). */
export const NUTATION_WHEEL_RADIUS_M = 0.33;

/** Distance from pivot to the wheel's center of mass along the axle (m). */
export const NUTATION_COM_DISTANCE_M = 0.14;

/** I₃ — spin-axis moment of inertia of a thin rim, M R² (kg·m²). */
export const NUTATION_SPIN_INERTIA_KG_M2 = NUTATION_WHEEL_MASS_KG * NUTATION_WHEEL_RADIUS_M ** 2;

/** I₁ — transverse moment about the pivot: ½ M R² for the rim plus the parallel-axis M l² (kg·m²). */
export const NUTATION_TRANSVERSE_INERTIA_KG_M2 =
  0.5 * NUTATION_WHEEL_MASS_KG * NUTATION_WHEEL_RADIUS_M ** 2 + NUTATION_WHEEL_MASS_KG * NUTATION_COM_DISTANCE_M ** 2;

/** Default spin about the symmetry axis (rad/s) — about 1.4× the critical spin at 45°. */
export const DEFAULT_NUTATION_SPIN_RAD_S = 7;

/** Default release tilt from the vertical (rad) — 45°. */
export const DEFAULT_NUTATION_TILT_RAD = Math.PI / 4;

/** Viscous drag on the center of mass when friction is enabled (N·m·s). */
export const NUTATION_TIP_DRAG_N_M_S = 0.055;

/** Spin friction at the pivot when friction is enabled (N·m·s). */
export const NUTATION_SPIN_DRAG_N_M_S = 0.008;

/** Tip-trace samples retained (8 s at 60 Hz), which also backs the θ(t) graph. */
export const NUTATION_TRACE_CAPACITY = 480;

/**
 * Samples actually drawn as the tip path (about 4 s, a little over one precession
 * revolution). Drawing the whole buffer overlays several revolutions and turns the
 * cusps into a mesh.
 */
export const NUTATION_TRACE_DRAW_SAMPLES = 260;

/** Sample interval for the tip trace and θ(t) graph (s). */
export const NUTATION_SAMPLE_INTERVAL_S = 1 / 60;

/** Visible time window of the θ(t) graph (s). */
export const NUTATION_GRAPH_WINDOW_S = 8;

// ── Torque-free screen: tumbling block (SI units) ─────────────────────────────
//
// A flat block with three clearly different sides, so its three principal moments
// are clearly different too. With sides a < b < c along the body's x, y, z axes the
// moments come out I₁ > I₂ > I₃: body x (perpendicular to the largest face) has the
// largest moment, body z (the long axis) the smallest, and body y is the intermediate
// axis that refuses to hold still.

/** Mass of the tumbling block (kg). */
export const TUMBLE_BOX_MASS_KG = 0.5;

/** Full side lengths of the block along its body x, y, z axes (m). */
export const TUMBLE_BOX_SIZE_M = { x: 0.1, y: 0.22, z: 0.34 } as const;

/** Default launch spin rate (rad/s) — about one turn per second. */
export const DEFAULT_TUMBLE_SPIN_RAD_S = 6;

/**
 * Transverse wobble added at launch, as a fraction of the spin rate. Rotation exactly
 * about the intermediate axis is a genuine solution, so without a nudge the block
 * would spin forever and the instability would never appear; a real throw always
 * contains one, and making it explicit beats leaving it to floating-point noise.
 */
export const TUMBLE_NUDGE_FRACTION = 0.04;

/** ω-history samples retained (10 s at 60 Hz). */
export const TUMBLE_HISTORY_CAPACITY = 600;

/** Sample interval for the ω history (s). */
export const TUMBLE_SAMPLE_INTERVAL_S = 1 / 60;

/** Visible time window of the ω(t) graph (s). */
export const TUMBLE_GRAPH_WINDOW_S = 10;

/** Height of the ω-component graph. */
export const TUMBLE_GRAPH_HEIGHT = 118;

/** Width of the control panel on the torque-free screen. */
export const TORQUE_FREE_PANEL_WIDTH = 300;

// ── Ranges ────────────────────────────────────────────────────────────────────

export const SPIN_RATE_RANGE = { min: 3 * 2 * Math.PI, max: 20 * 2 * Math.PI };
export const ARM_MASS_RANGE = { min: 0.1, max: 1.0 };
export const PIVOT_DISTANCE_RANGE = { min: 0.45, max: 0.78 };

/**
 * Axle tilt range for Screen 1 (rad) — 25° to 75°. Steady precession is
 * tilt-independent, so this control exists to let that be discovered.
 */
export const TILT_ANGLE_RANGE = { min: (25 * Math.PI) / 180, max: (75 * Math.PI) / 180 };

/** Spin range for the nutation screen (rad/s); spans the critical spin at 45°. */
export const NUTATION_SPIN_RANGE = { min: 2, max: 20 };

/**
 * Tilt at which the axle bottoms out on its mount (rad) — horizontal. A top that loses
 * its spin falls only this far; past it the axle would swing through the support.
 */
export const NUTATION_MAX_TILT_RAD = Math.PI / 2;

/**
 * Release-tilt range for the nutation screen (rad) — 3° to 80°.
 *
 * The bottom of the range reaches the near-vertical release that separates a top
 * that *sleeps* from one that topples: above the critical spin the axis stays put,
 * below it the top flops over to the mechanical stop. 3° rather than 0° because the
 * Euler angles are singular on the axis itself, and a real top is never released
 * perfectly upright either.
 */
export const NUTATION_TILT_RANGE = { min: (3 * Math.PI) / 180, max: (80 * Math.PI) / 180 };

/** Launch spin range for the torque-free screen (rad/s). */
export const TUMBLE_SPIN_RANGE = { min: 2, max: 12 };

RigidBodyPrecessionNamespace.register("RigidBodyPrecessionConstants", {
  SCREEN_VIEW_MARGIN,
  PANEL_CORNER_RADIUS,
  GRAVITY_MPS2,
});
