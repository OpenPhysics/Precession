/**
 * RigidBodyPrecessionColors.ts
 *
 * Defines all dynamic colors for the simulation using ProfileColorProperty.
 *
 * Each color has two profiles:
 *   - "default"   — used in standard (dark) mode
 *   - "projector" — used when the user enables Projector Mode in Preferences
 *
 * SceneryStack switches profiles automatically; no manual toggling is needed.
 *
 * ── Usage ─────────────────────────────────────────────────────────────────────
 * Import RigidBodyPrecessionColors and pass properties directly to Node's fillProperty or
 * strokeProperty options:
 *
 *   import RigidBodyPrecessionColors from "../../RigidBodyPrecessionColors.js";
 *
 *   new Rectangle( 0, 0, 100, 50, {
 *     fillProperty: RigidBodyPrecessionColors.backgroundColorProperty,
 *   });
 *
 * ── How to add a color ────────────────────────────────────────────────────────
 * Add a new ProfileColorProperty entry to the RigidBodyPrecessionColors object below.
 * Always provide both "default" and "projector" values.
 */
import { Color, ProfileColorProperty } from "scenerystack/scenery";
import RigidBodyPrecessionNamespace from "./RigidBodyPrecessionNamespace.js";

const RigidBodyPrecessionColors = {
  /**
   * Background color for the simulation screen.
   * Deep navy in default mode; white in projector mode.
   */
  backgroundColorProperty: new ProfileColorProperty(RigidBodyPrecessionNamespace, "background", {
    default: "#1a1a2e",
    projector: "#ffffff",
  }),

  /**
   * Primary accent color for highlights, selected items, and key UI elements.
   * Sky blue in default mode; dark navy in projector mode.
   */
  accentColorProperty: new ProfileColorProperty(RigidBodyPrecessionNamespace, "accent", {
    default: "#4fc3f7",
    projector: "#1a1a2e",
  }),

  /**
   * Background fill for control panels and dialogs.
   * Deep blue in default mode; light gray in projector mode.
   */
  panelBackgroundColorProperty: new ProfileColorProperty(RigidBodyPrecessionNamespace, "panelBackground", {
    default: "#16213e",
    projector: "#f5f5f5",
  }),

  /**
   * Border/stroke color for control panels and dialogs.
   * Teal-navy in default mode; medium gray in projector mode.
   */
  panelBorderColorProperty: new ProfileColorProperty(RigidBodyPrecessionNamespace, "panelBorder", {
    default: "#0f3460",
    projector: "#999999",
  }),

  /**
   * Text color for labels, readouts, and general UI text.
   * Near-white in default mode; near-black in projector mode.
   */
  textColorProperty: new ProfileColorProperty(RigidBodyPrecessionNamespace, "text", {
    default: "#e0e0e0",
    projector: "#1a1a1a",
  }),

  // ── Light control surfaces ───────────────────────────────────────────────────
  // White chrome (combo boxes, flat push buttons, editable input fields) stays light
  // in both profiles; its text stays dark. Same values in default and projector mode,
  // but defined here so every color lives in one themeable place.

  /** Fill of light control surfaces: combo-box button/list, editable input fields. */
  controlSurfaceColorProperty: new ProfileColorProperty(RigidBodyPrecessionNamespace, "controlSurface", {
    default: "#ffffff",
    projector: "#ffffff",
  }),

  /** Fill of a disabled control surface (grayed-out editable input field). */
  controlSurfaceDisabledColorProperty: new ProfileColorProperty(
    RigidBodyPrecessionNamespace,
    "controlSurfaceDisabled",
    {
      default: "#cccccc",
      projector: "#cccccc",
    },
  ),

  /** Text on light control surfaces: combo items, flat-button labels, field values, preferences. */
  controlSurfaceTextColorProperty: new ProfileColorProperty(RigidBodyPrecessionNamespace, "controlSurfaceText", {
    default: "#1a1a1a",
    projector: "#1a1a1a",
  }),

  /** Angular momentum vector L. */
  angularMomentumColorProperty: new ProfileColorProperty(RigidBodyPrecessionNamespace, "angularMomentum", {
    default: "#4fc3f7",
    projector: "#0277bd",
  }),

  /** Gravitational torque vector τ. */
  torqueColorProperty: new ProfileColorProperty(RigidBodyPrecessionNamespace, "torque", {
    default: "#ff7043",
    projector: "#d84315",
  }),

  /** Weight / gravity force vector. */
  weightColorProperty: new ProfileColorProperty(RigidBodyPrecessionNamespace, "weight", {
    default: "#ffd54f",
    projector: "#f9a825",
  }),

  /** Precession angular velocity vector Ω. */
  precessionColorProperty: new ProfileColorProperty(RigidBodyPrecessionNamespace, "precession", {
    default: "#81c784",
    projector: "#2e7d32",
  }),

  /** Gyroscope axle and disk chrome. */
  gyroscopeColorProperty: new ProfileColorProperty(RigidBodyPrecessionNamespace, "gyroscope", {
    default: "#b0bec5",
    projector: "#546e7a",
  }),

  /** Graph background fill. */
  graphBackgroundColorProperty: new ProfileColorProperty(RigidBodyPrecessionNamespace, "graphBackground", {
    default: "#0f1a2e",
    projector: "#f0f0f0",
  }),

  /** Graph grid lines. */
  graphGridColorProperty: new ProfileColorProperty(RigidBodyPrecessionNamespace, "graphGrid", {
    default: "#2a3f5f",
    projector: "#cccccc",
  }),

  /** Graph trace line. */
  graphTraceColorProperty: new ProfileColorProperty(RigidBodyPrecessionNamespace, "graphTrace", {
    default: "#81c784",
    projector: "#2e7d32",
  }),

  /** Translucent ground ellipse under the gyroscope (panel-border hue @ 40%). */
  sceneGroundColorProperty: new ProfileColorProperty(RigidBodyPrecessionNamespace, "sceneGround", {
    default: new Color(15, 52, 96, 0.4),
    projector: new Color(153, 153, 153, 0.35),
  }),

  /** Path traced by the axle tip on the nutation screen. */
  tipTraceColorProperty: new ProfileColorProperty(RigidBodyPrecessionNamespace, "tipTrace", {
    default: "#ffb74d",
    projector: "#e65100",
  }),

  /** Turning-point circles bounding the nutation band. */
  nutationBandColorProperty: new ProfileColorProperty(RigidBodyPrecessionNamespace, "nutationBand", {
    default: "#ce93d8",
    projector: "#6a1b9a",
  }),

  /** Face of the gyroscope wheel on the nutation screen (translucent so the trace shows through). */
  wheelFillColorProperty: new ProfileColorProperty(RigidBodyPrecessionNamespace, "wheelFill", {
    default: new Color(79, 195, 247, 0.55),
    projector: new Color(2, 119, 189, 0.4),
  }),

  /** Readout color for a state that is unstable or out of range (spin below critical). */
  warningColorProperty: new ProfileColorProperty(RigidBodyPrecessionNamespace, "warning", {
    default: "#ff8a65",
    projector: "#bf360c",
  }),

  /** Top-view inset card fill (graph-background hue @ 70%). */
  sceneInsetCardColorProperty: new ProfileColorProperty(RigidBodyPrecessionNamespace, "sceneInsetCard", {
    default: new Color(15, 26, 46, 0.7),
    projector: new Color(240, 240, 240, 0.85),
  }),
};

export default RigidBodyPrecessionColors;
