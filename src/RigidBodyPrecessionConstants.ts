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
export const PRECESSION_GRAPH_HEIGHT = 160;

/** Width of the control panel on the nutation screen. */
export const NUTATION_PANEL_WIDTH = 300;

/** Height of the nutation-angle graph. */
export const NUTATION_GRAPH_HEIGHT = 130;

// ── Physics defaults (SI units) ───────────────────────────────────────────────

/** Gravitational acceleration (m/s²). */
export const GRAVITY_MPS2 = 9.81;

/** Mass of the spinning disk (kg). */
export const DISK_MASS_KG = 0.5;

/** Disk moment of inertia about its spin axis (kg·m²). */
export const DISK_INERTIA_KG_M2 = 0.002;

/** Distance from pivot to disk center along the axle (m). */
export const DISK_POSITION_FROM_PIVOT_M = 0.15;

/** Default tilt of the axle from vertical (rad) — 45°. */
export const DEFAULT_TILT_ANGLE_RAD = Math.PI / 4;

/** Time constant for spin-up toward the target spin rate (s). */
export const SPIN_UP_TIME_CONSTANT_S = 1.5;

/** Number of graph samples retained in the rolling buffer. */
export const PRECESSION_GRAPH_CAPACITY = 600;

/** Default target spin rate (rad/s) — about 30 rev/s. */
export const DEFAULT_SPIN_RATE_RAD_S = 30 * 2 * Math.PI;

/** Default arm mass (kg). */
export const DEFAULT_ARM_MASS_KG = 0.2;

/** Default pivot-to-mass distance (m). */
export const DEFAULT_PIVOT_TO_MASS_DISTANCE_M = 0.35;

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

// ── Ranges ────────────────────────────────────────────────────────────────────

export const SPIN_RATE_RANGE = { min: 5 * 2 * Math.PI, max: 80 * 2 * Math.PI };
export const ARM_MASS_RANGE = { min: 0.05, max: 0.5 };
export const PIVOT_DISTANCE_RANGE = { min: 0.15, max: 0.5 };

/** Spin range for the nutation screen (rad/s); spans the critical spin at 45°. */
export const NUTATION_SPIN_RANGE = { min: 2, max: 20 };

/**
 * Tilt at which the axle bottoms out on its mount (rad) — horizontal. A top that loses
 * its spin falls only this far; past it the axle would swing through the support.
 */
export const NUTATION_MAX_TILT_RAD = Math.PI / 2;

/** Release-tilt range for the nutation screen (rad) — 15° to 80°. */
export const NUTATION_TILT_RANGE = { min: (15 * Math.PI) / 180, max: (80 * Math.PI) / 180 };

RigidBodyPrecessionNamespace.register("RigidBodyPrecessionConstants", {
  SCREEN_VIEW_MARGIN,
  PANEL_CORNER_RADIUS,
  GRAVITY_MPS2,
});
