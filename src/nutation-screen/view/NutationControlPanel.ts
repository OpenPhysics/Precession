/**
 * NutationControlPanel.ts
 *
 * Launch controls for the heavy top — spin, release tilt, release mode, friction —
 * plus readouts of the nutation band, the two frequencies, and the critical spin.
 * Every slider here is an initial condition, so moving one re-releases the top.
 */

import { DerivedProperty, type NumberProperty, type TReadOnlyProperty } from "scenerystack/axon";
import { Dimension2, Range, toFixed } from "scenerystack/dot";
import { type Color, HBox, Line, type Node, RichText, Text, VBox } from "scenerystack/scenery";
import { NumberControl, PhetFont } from "scenerystack/scenery-phet";
import { Checkbox, ComboBox, RectangularPushButton } from "scenerystack/sun";
import type { ReleaseMode } from "../../common/rigid-body/HeavySymmetricTopPhysics.js";
import {
  FLAT_RECTANGULAR_BUTTON_OPTIONS,
  LIGHT_SURFACE_TEXT_FILL,
  SIM_COMBO_BOX_OPTIONS,
} from "../../common/SimButtonOptions.js";
import { SimPanel } from "../../common/SimPanel.js";
import { createUnitProxy } from "../../common/view/UnitProxyProperty.js";
import { StringManager } from "../../i18n/StringManager.js";
import RigidBodyPrecessionColors from "../../RigidBodyPrecessionColors.js";
import { NUTATION_PANEL_WIDTH, NUTATION_SPIN_RANGE, NUTATION_TILT_RANGE } from "../../RigidBodyPrecessionConstants.js";
import type { NutationModel } from "../model/NutationModel.js";

const TITLE_FONT = new PhetFont({ size: 13, weight: "bold" });
const SECTION_FONT = new PhetFont({ size: 12, weight: "bold" });
const READOUT_FONT = new PhetFont({ size: 13 });
const READOUT_LABEL_FONT = new PhetFont({ size: 12 });
const SLIDER_WIDTH = NUTATION_PANEL_WIDTH - 56;

const HZ_PER_RAD_S = 1 / (2 * Math.PI);
const DEGREES_PER_RADIAN = 180 / Math.PI;

function createNumberControl(
  title: TReadOnlyProperty<string>,
  property: NumberProperty,
  range: Range,
  delta: number,
  decimalPlaces: number,
  accessibleName: TReadOnlyProperty<string>,
): NumberControl {
  const titleNode = new Text(title, { font: TITLE_FONT, fill: RigidBodyPrecessionColors.textColorProperty });
  return new NumberControl(titleNode, property, range, {
    delta,
    layoutFunction: NumberControl.createLayoutFunction1({ align: "center", ySpacing: 2 }),
    numberDisplayOptions: {
      decimalPlaces,
      textOptions: { font: READOUT_FONT },
    },
    sliderOptions: {
      trackSize: new Dimension2(SLIDER_WIDTH, 4),
      thumbSize: new Dimension2(14, 22),
    },
    arrowButtonOptions: FLAT_RECTANGULAR_BUTTON_OPTIONS,
    accessibleName,
  });
}

function readoutRow(
  label: string | TReadOnlyProperty<string>,
  valueProperty: TReadOnlyProperty<string>,
  colorProperty: TReadOnlyProperty<Color>,
): Node {
  return new HBox({
    spacing: 8,
    children: [
      new Text(label, { font: READOUT_LABEL_FONT, fill: RigidBodyPrecessionColors.textColorProperty }),
      new Text(valueProperty, { font: READOUT_FONT, fill: colorProperty }),
    ],
  });
}

export class NutationControlPanel extends SimPanel {
  public constructor(model: NutationModel, listParent: Node) {
    const strings = StringManager.getInstance().getNutationStrings();
    const a11y = StringManager.getInstance().getNutationA11yStrings();

    const spinHzRange = new Range(NUTATION_SPIN_RANGE.min * HZ_PER_RAD_S, NUTATION_SPIN_RANGE.max * HZ_PER_RAD_S);
    const spinControl = createNumberControl(
      strings.spinRateStringProperty,
      createUnitProxy(model.spinRateProperty, HZ_PER_RAD_S, spinHzRange, "Hz"),
      spinHzRange,
      0.05,
      2,
      a11y.controls.spinRateStringProperty,
    );

    const tiltDegreeRange = new Range(
      Math.round(NUTATION_TILT_RANGE.min * DEGREES_PER_RADIAN),
      Math.round(NUTATION_TILT_RANGE.max * DEGREES_PER_RADIAN),
    );
    const tiltControl = createNumberControl(
      strings.initialTiltStringProperty,
      createUnitProxy(model.initialTiltProperty, DEGREES_PER_RADIAN, tiltDegreeRange, "°"),
      tiltDegreeRange,
      1,
      0,
      a11y.controls.initialTiltStringProperty,
    );

    const releaseLabel = new Text(strings.releaseModeStringProperty, {
      font: TITLE_FONT,
      fill: RigidBodyPrecessionColors.textColorProperty,
    });

    const releaseItems: Array<{
      value: ReleaseMode;
      createNode: () => Node;
      accessibleName: TReadOnlyProperty<string>;
    }> = [
      {
        value: "cusp",
        createNode: () =>
          new Text(strings.releaseCuspStringProperty, { font: READOUT_FONT, fill: LIGHT_SURFACE_TEXT_FILL }),
        accessibleName: strings.releaseCuspStringProperty,
      },
      {
        value: "loop",
        createNode: () =>
          new Text(strings.releaseLoopStringProperty, { font: READOUT_FONT, fill: LIGHT_SURFACE_TEXT_FILL }),
        accessibleName: strings.releaseLoopStringProperty,
      },
      {
        value: "smooth",
        createNode: () =>
          new Text(strings.releaseSmoothStringProperty, { font: READOUT_FONT, fill: LIGHT_SURFACE_TEXT_FILL }),
        accessibleName: strings.releaseSmoothStringProperty,
      },
      {
        value: "steady",
        createNode: () =>
          new Text(strings.releaseSteadyStringProperty, { font: READOUT_FONT, fill: LIGHT_SURFACE_TEXT_FILL }),
        accessibleName: strings.releaseSteadyStringProperty,
      },
    ];

    const releaseComboBox = new ComboBox<ReleaseMode>(model.releaseModeProperty, releaseItems, listParent, {
      ...SIM_COMBO_BOX_OPTIONS,
      accessibleName: a11y.controls.releaseModeStringProperty,
      listPosition: "below",
    });

    const frictionCheckbox = new Checkbox(
      model.frictionEnabledProperty,
      new Text(strings.frictionStringProperty, {
        font: READOUT_FONT,
        fill: RigidBodyPrecessionColors.textColorProperty,
        maxWidth: NUTATION_PANEL_WIDTH - 60,
      }),
      {
        accessibleName: a11y.controls.frictionStringProperty,
        boxWidth: 18,
      },
    );

    const releaseButton = new RectangularPushButton({
      ...FLAT_RECTANGULAR_BUTTON_OPTIONS,
      content: new Text(strings.releaseAgainStringProperty, { font: READOUT_FONT, fill: LIGHT_SURFACE_TEXT_FILL }),
      baseColor: RigidBodyPrecessionColors.controlSurfaceColorProperty,
      accessibleName: a11y.controls.releaseAgainStringProperty,
      listener: () => model.release(),
    });

    const bandValueProperty = new DerivedProperty([model.nutationBandProperty], (band) => {
      const min = toFixed((band.thetaMin * 180) / Math.PI, 1);
      const max = toFixed((band.thetaMax * 180) / Math.PI, 1);
      return `${min}° – ${max}°`;
    });
    const nutationValueProperty = new DerivedProperty(
      [model.nutationFrequencyProperty],
      (rate) => `${toFixed(rate * HZ_PER_RAD_S, 2)} Hz`,
    );
    const precessionValueProperty = new DerivedProperty(
      [model.meanPrecessionRateProperty],
      (rate) => `${toFixed(rate * HZ_PER_RAD_S, 3)} Hz`,
    );
    const criticalValueProperty = new DerivedProperty(
      [model.criticalSpinProperty],
      (rate) => `${toFixed(rate * HZ_PER_RAD_S, 2)} Hz`,
    );
    const criticalColorProperty = new DerivedProperty([model.aboveCriticalSpinProperty], (above) =>
      above
        ? RigidBodyPrecessionColors.precessionColorProperty.value
        : RigidBodyPrecessionColors.warningColorProperty.value,
    );

    // A sleeping top is the one classic regime the tilt slider can now actually reach:
    // wind θ₀ down to its minimum and a top above the critical spin holds itself
    // upright, while one below it flops straight over to the mechanical stop.
    const sleepValueProperty = new DerivedProperty(
      [model.sleepingStableProperty, strings.sleepsStringProperty, strings.topplesStringProperty],
      (sleeps, sleepsText, topplesText) => (sleeps ? sleepsText : topplesText),
    );
    const sleepColorProperty = new DerivedProperty([model.sleepingStableProperty], (sleeps) =>
      sleeps
        ? RigidBodyPrecessionColors.precessionColorProperty.value
        : RigidBodyPrecessionColors.warningColorProperty.value,
    );

    // The two constants of the motion. With friction off they hold to many decimal
    // places for as long as the sim runs, which is the most convincing evidence a
    // student can get that the integrator is solving the real Lagrangian; switch
    // friction on and watching them bleed away is the point of that checkbox.
    const energyValueProperty = new DerivedProperty([model.energyProperty], (energy) => `${toFixed(energy, 3)} J`);
    const momentumValueProperty = new DerivedProperty(
      [model.verticalMomentumProperty],
      (momentum) => `${toFixed(momentum, 3)} kg·m²/s`,
    );

    const separator = new Line(0, 0, NUTATION_PANEL_WIDTH - 40, 0, {
      stroke: RigidBodyPrecessionColors.panelBorderColorProperty,
      lineWidth: 1,
    });

    const readoutHeader = new Text(strings.readoutsTitleStringProperty, {
      font: SECTION_FONT,
      fill: RigidBodyPrecessionColors.accentColorProperty,
    });

    const criticalWarning = new RichText(strings.belowCriticalStringProperty, {
      font: new PhetFont({ size: 11 }),
      fill: RigidBodyPrecessionColors.warningColorProperty,
      lineWrap: NUTATION_PANEL_WIDTH - 40,
      visibleProperty: new DerivedProperty([model.aboveCriticalSpinProperty], (above) => !above),
    });

    const sleepNote = new RichText(strings.sleepNoteStringProperty, {
      font: new PhetFont({ size: 10 }),
      fill: RigidBodyPrecessionColors.textColorProperty,
      lineWrap: NUTATION_PANEL_WIDTH - 40,
      opacity: 0.7,
    });

    const conservedNote = new RichText(strings.conservedNoteStringProperty, {
      font: new PhetFont({ size: 10 }),
      fill: RigidBodyPrecessionColors.textColorProperty,
      lineWrap: NUTATION_PANEL_WIDTH - 40,
      opacity: 0.7,
    });

    // RichText, not Text: a long sentence given only a maxWidth is scaled down to fit
    // on one line, which at this size is unreadable. lineWrap wraps it instead.
    const insight = new RichText(strings.insightStringProperty, {
      font: new PhetFont({ size: 11 }),
      fill: RigidBodyPrecessionColors.textColorProperty,
      lineWrap: NUTATION_PANEL_WIDTH - 40,
      opacity: 0.85,
    });

    const content = new VBox({
      spacing: 10,
      align: "left",
      children: [
        spinControl,
        tiltControl,
        new VBox({ spacing: 4, align: "left", children: [releaseLabel, releaseComboBox] }),
        frictionCheckbox,
        releaseButton,
        separator,
        readoutHeader,
        readoutRow("θ range", bandValueProperty, RigidBodyPrecessionColors.nutationBandColorProperty),
        readoutRow("f_nut", nutationValueProperty, RigidBodyPrecessionColors.tipTraceColorProperty),
        readoutRow("Ω_mean", precessionValueProperty, RigidBodyPrecessionColors.precessionColorProperty),
        readoutRow("ω₃ min", criticalValueProperty, criticalColorProperty),
        readoutRow(strings.sleepLabelStringProperty, sleepValueProperty, sleepColorProperty),
        readoutRow("E", energyValueProperty, RigidBodyPrecessionColors.textColorProperty),
        readoutRow("p_φ", momentumValueProperty, RigidBodyPrecessionColors.textColorProperty),
        sleepNote,
        conservedNote,
        criticalWarning,
        insight,
      ],
    });

    super(content, { minWidth: NUTATION_PANEL_WIDTH });
  }
}
