/**
 * SteadyPrecessionControlPanel.ts
 *
 * Controls for spin rate, arm mass, pivot distance, and pivot-at-COM toggle,
 * plus structured τ / Ω readouts.
 */

import { DerivedProperty, type NumberProperty, type TReadOnlyProperty } from "scenerystack/axon";
import { Dimension2, Range, toFixed } from "scenerystack/dot";
import { HBox, Line, type Node, RichText, Text, VBox } from "scenerystack/scenery";
import { NumberControl, PhetFont } from "scenerystack/scenery-phet";
import { Checkbox } from "scenerystack/sun";
import { FLAT_RECTANGULAR_BUTTON_OPTIONS } from "../../common/SimButtonOptions.js";
import { SimPanel } from "../../common/SimPanel.js";
import { createUnitProxy } from "../../common/view/UnitProxyProperty.js";
import { StringManager } from "../../i18n/StringManager.js";
import RigidBodyPrecessionColors from "../../RigidBodyPrecessionColors.js";
import {
  ARM_MASS_RANGE,
  PIVOT_DISTANCE_RANGE,
  SPIN_RATE_RANGE,
  STEADY_PRECESSION_PANEL_WIDTH,
  TILT_ANGLE_RANGE,
} from "../../RigidBodyPrecessionConstants.js";
import type { SteadyPrecessionModel } from "../model/SteadyPrecessionModel.js";

const TITLE_FONT = new PhetFont({ size: 13, weight: "bold" });
const SECTION_FONT = new PhetFont({ size: 12, weight: "bold" });
const READOUT_FONT = new PhetFont({ size: 13 });
const READOUT_LABEL_FONT = new PhetFont({ size: 12 });
const SLIDER_WIDTH = STEADY_PRECESSION_PANEL_WIDTH - 56;

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
  label: string,
  valueProperty: TReadOnlyProperty<string>,
  colorProperty: typeof RigidBodyPrecessionColors.textColorProperty,
): Node {
  return new HBox({
    spacing: 8,
    children: [
      new Text(label, { font: READOUT_LABEL_FONT, fill: RigidBodyPrecessionColors.textColorProperty }),
      new Text(valueProperty, { font: READOUT_FONT, fill: colorProperty }),
    ],
  });
}

export class SteadyPrecessionControlPanel extends SimPanel {
  public constructor(model: SteadyPrecessionModel) {
    const strings = StringManager.getInstance().getSteadyPrecessionStrings();
    const a11y = StringManager.getInstance().getSteadyPrecessionA11yStrings();

    const spinHzRange = new Range(SPIN_RATE_RANGE.min / (2 * Math.PI), SPIN_RATE_RANGE.max / (2 * Math.PI));
    const spinHzProperty = createUnitProxy(model.spinRateProperty, 1 / (2 * Math.PI), spinHzRange, "Hz");

    const spinControl = createNumberControl(
      strings.spinRateStringProperty,
      spinHzProperty,
      spinHzRange,
      1,
      0,
      a11y.controls.spinRateStringProperty,
    );

    const armMassControl = createNumberControl(
      strings.armMassStringProperty,
      model.armMassProperty,
      new Range(ARM_MASS_RANGE.min, ARM_MASS_RANGE.max),
      0.01,
      2,
      a11y.controls.armMassStringProperty,
    );

    const pivotDistanceControl = createNumberControl(
      strings.pivotDistanceStringProperty,
      model.pivotToMassDistanceProperty,
      new Range(PIVOT_DISTANCE_RANGE.min, PIVOT_DISTANCE_RANGE.max),
      0.01,
      2,
      a11y.controls.pivotDistanceStringProperty,
    );

    // Tilt is in degrees on screen but radians in the model.
    const tiltDegreesRange = new Range((TILT_ANGLE_RANGE.min * 180) / Math.PI, (TILT_ANGLE_RANGE.max * 180) / Math.PI);
    const tiltDegreesProperty = createUnitProxy(model.tiltAngleProperty, 180 / Math.PI, tiltDegreesRange, "°");

    const tiltControl = createNumberControl(
      strings.tiltAngleStringProperty,
      tiltDegreesProperty,
      tiltDegreesRange,
      1,
      0,
      a11y.controls.tiltAngleStringProperty,
    );

    model.pivotAtCenterOfMassProperty.link((atCom) => {
      pivotDistanceControl.enabledProperty.value = !atCom;
    });

    const pivotAtComCheckbox = new Checkbox(
      model.pivotAtCenterOfMassProperty,
      new Text(strings.pivotAtComStringProperty, {
        font: READOUT_FONT,
        fill: RigidBodyPrecessionColors.textColorProperty,
        maxWidth: STEADY_PRECESSION_PANEL_WIDTH - 60,
      }),
      {
        accessibleName: a11y.controls.pivotAtComStringProperty,
        boxWidth: 18,
      },
    );

    const torqueValueProperty = new DerivedProperty(
      [
        model.armMassProperty,
        model.pivotToMassDistanceProperty,
        model.pivotAtCenterOfMassProperty,
        model.tiltAngleProperty,
      ],
      () => `${toFixed(model.getVectors().torqueMagnitude, 2)} N·m`,
    );
    const predictedValueProperty = new DerivedProperty([model.predictedPrecessionRateProperty], (omega) => {
      return `${toFixed(omega / (2 * Math.PI), 3)} Hz`;
    });
    const measuredValueProperty = new DerivedProperty([model.measuredPrecessionRateProperty], (omega) => {
      return `${toFixed(omega / (2 * Math.PI), 3)} Hz`;
    });

    const separator = new Line(0, 0, STEADY_PRECESSION_PANEL_WIDTH - 40, 0, {
      stroke: RigidBodyPrecessionColors.panelBorderColorProperty,
      lineWidth: 1,
    });

    const readoutHeader = new Text(strings.readoutsTitleStringProperty, {
      font: SECTION_FONT,
      fill: RigidBodyPrecessionColors.accentColorProperty,
    });

    // RichText, not Text: a long sentence given only a maxWidth is scaled down to
    // fit on one line, which at this size is unreadable. lineWrap wraps it instead.
    const formulaHint = new RichText(strings.formulaHintStringProperty, {
      font: new PhetFont({ size: 11 }),
      fill: RigidBodyPrecessionColors.textColorProperty,
      lineWrap: STEADY_PRECESSION_PANEL_WIDTH - 40,
      opacity: 0.85,
    });

    // Ω = Mgl/(I₃ω) drops the angular momentum the precession itself carries. The
    // ratio Ω/ω says how big that omission is, and the warning fires when the answer
    // stops being trustworthy — which is precisely the regime Screen 2 integrates.
    const ratioValueProperty = new DerivedProperty([model.gyroscopicRatioProperty], (ratio) =>
      Number.isFinite(ratio) ? `1 : ${toFixed(1 / Math.max(ratio, 1e-9), 0)}` : "—",
    );

    const validityWarning = new RichText(strings.validityWarningStringProperty, {
      font: new PhetFont({ size: 11 }),
      fill: RigidBodyPrecessionColors.warningColorProperty,
      lineWrap: STEADY_PRECESSION_PANEL_WIDTH - 40,
    });
    model.idealizationValidProperty.link((valid) => {
      validityWarning.visible = !valid;
    });

    const content = new VBox({
      spacing: 9,
      align: "left",
      children: [
        spinControl,
        armMassControl,
        pivotDistanceControl,
        tiltControl,
        pivotAtComCheckbox,
        separator,
        readoutHeader,
        readoutRow("τ", torqueValueProperty, RigidBodyPrecessionColors.torqueColorProperty),
        readoutRow("Ω_pred", predictedValueProperty, RigidBodyPrecessionColors.precessionColorProperty),
        readoutRow("Ω_meas", measuredValueProperty, RigidBodyPrecessionColors.graphTraceColorProperty),
        readoutRow("Ω : ω", ratioValueProperty, RigidBodyPrecessionColors.textColorProperty),
        formulaHint,
        validityWarning,
      ],
    });

    super(content, { minWidth: STEADY_PRECESSION_PANEL_WIDTH });
  }
}
