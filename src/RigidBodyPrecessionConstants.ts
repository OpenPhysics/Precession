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

// ── Ranges ────────────────────────────────────────────────────────────────────

export const SPIN_RATE_RANGE = { min: 5 * 2 * Math.PI, max: 80 * 2 * Math.PI };
export const ARM_MASS_RANGE = { min: 0.05, max: 0.5 };
export const PIVOT_DISTANCE_RANGE = { min: 0.15, max: 0.5 };

RigidBodyPrecessionNamespace.register("RigidBodyPrecessionConstants", {
  SCREEN_VIEW_MARGIN,
  PANEL_CORNER_RADIUS,
  GRAVITY_MPS2,
});
