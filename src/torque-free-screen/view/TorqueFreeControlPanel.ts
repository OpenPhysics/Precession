/**
 * TorqueFreeControlPanel.ts
 *
 * Launch controls for Screen 3, plus the readouts that make the flip believable:
 * the two invariants, which hold through every flip, and the growth rate that says
 * how quickly the instability builds.
 */

import { DerivedProperty, type NumberProperty, type TReadOnlyProperty } from "scenerystack/axon";
import { Dimension2, Range, toFixed } from "scenerystack/dot";
import { HBox, Line, type Node, Text, VBox } from "scenerystack/scenery";
import { NumberControl, PhetFont } from "scenerystack/scenery-phet";
import { Checkbox, ComboBox, type ComboBoxItem } from "scenerystack/sun";
import { LIGHT_SURFACE_TEXT_FILL, SIM_COMBO_BOX_OPTIONS } from "../../common/SimButtonOptions.js";
import { SimPanel } from "../../common/SimPanel.js";
import { StringManager } from "../../i18n/StringManager.js";
import RigidBodyPrecessionColors from "../../RigidBodyPrecessionColors.js";
import { TORQUE_FREE_PANEL_WIDTH, TUMBLE_SPIN_RANGE } from "../../RigidBodyPrecessionConstants.js";
import type { SpinAxis, TorqueFreeModel } from "../model/TorqueFreeModel.js";

const TITLE_FONT = new PhetFont({ size: 13, weight: "bold" });
const SECTION_FONT = new PhetFont({ size: 12, weight: "bold" });
const READOUT_FONT = new PhetFont({ size: 13 });
const READOUT_LABEL_FONT = new PhetFont({ size: 12 });
const NOTE_FONT = new PhetFont({ size: 11 });
const SLIDER_WIDTH = TORQUE_FREE_PANEL_WIDTH - 56;

function readoutRow(
  label: string,
  valueProperty: TReadOnlyProperty<string>,
  colorProperty: typeof RigidBodyPrecessionColors.textColorProperty | TReadOnlyProperty<string>,
): Node {
  return new HBox({
    spacing: 8,
    children: [
      new Text(label, { font: READOUT_LABEL_FONT, fill: RigidBodyPrecessionColors.textColorProperty }),
      new Text(valueProperty, { font: READOUT_FONT, fill: colorProperty }),
    ],
  });
}

export class TorqueFreeControlPanel extends SimPanel {
  public constructor(model: TorqueFreeModel, listParent: Node) {
    const strings = StringManager.getInstance().getTorqueFreeStrings();
    const a11y = StringManager.getInstance().getTorqueFreeA11yStrings();

    const axisLabel = new Text(strings.spinAxisStringProperty, {
      font: TITLE_FONT,
      fill: RigidBodyPrecessionColors.textColorProperty,
    });

    const axisItems: ComboBoxItem<SpinAxis>[] = [
      {
        value: "maxInertia",
        createNode: () =>
          new Text(strings.axisMaxStringProperty, { font: READOUT_FONT, fill: LIGHT_SURFACE_TEXT_FILL }),
        accessibleName: strings.axisMaxStringProperty,
      },
      {
        value: "intermediate",
        createNode: () =>
          new Text(strings.axisIntermediateStringProperty, { font: READOUT_FONT, fill: LIGHT_SURFACE_TEXT_FILL }),
        accessibleName: strings.axisIntermediateStringProperty,
      },
      {
        value: "minInertia",
        createNode: () =>
          new Text(strings.axisMinStringProperty, { font: READOUT_FONT, fill: LIGHT_SURFACE_TEXT_FILL }),
        accessibleName: strings.axisMinStringProperty,
      },
    ];

    const axisComboBox = new ComboBox<SpinAxis>(model.spinAxisProperty, axisItems, listParent, {
      ...SIM_COMBO_BOX_OPTIONS,
      accessibleName: a11y.controls.spinAxisStringProperty,
      listPosition: "below",
    });

    const spinControl = new NumberControl(
      new Text(strings.spinRateStringProperty, {
        font: TITLE_FONT,
        fill: RigidBodyPrecessionColors.textColorProperty,
      }),
      model.spinRateProperty as NumberProperty,
      new Range(TUMBLE_SPIN_RANGE.min, TUMBLE_SPIN_RANGE.max),
      {
        delta: 0.5,
        layoutFunction: NumberControl.createLayoutFunction1({ align: "center", ySpacing: 2 }),
        numberDisplayOptions: { decimalPlaces: 1, textOptions: { font: READOUT_FONT } },
        sliderOptions: { trackSize: new Dimension2(SLIDER_WIDTH, 4), thumbSize: new Dimension2(14, 22) },
        accessibleName: a11y.controls.spinRateStringProperty,
      },
    );

    const nudgeCheckbox = new Checkbox(
      model.nudgeEnabledProperty,
      new Text(strings.nudgeStringProperty, {
        font: READOUT_FONT,
        fill: RigidBodyPrecessionColors.textColorProperty,
        maxWidth: TORQUE_FREE_PANEL_WIDTH - 60,
      }),
      { accessibleName: a11y.controls.nudgeStringProperty, boxWidth: 18 },
    );

    const separator = new Line(0, 0, TORQUE_FREE_PANEL_WIDTH - 40, 0, {
      stroke: RigidBodyPrecessionColors.panelBorderColorProperty,
      lineWidth: 1,
    });

    const readoutHeader = new Text(strings.readoutsTitleStringProperty, {
      font: SECTION_FONT,
      fill: RigidBodyPrecessionColors.accentColorProperty,
    });

    const energyValueProperty = new DerivedProperty([model.energyProperty], (energy) => `${toFixed(energy, 4)} J`);
    const momentumValueProperty = new DerivedProperty(
      [model.momentumProperty],
      (momentum) => `${toFixed(momentum, 4)} kg·m²/s`,
    );
    const stabilityValueProperty = new DerivedProperty(
      [model.axisStableProperty, strings.stableStringProperty, strings.unstableStringProperty],
      (stable, stableText, unstableText) => (stable ? stableText : unstableText),
    );
    const stabilityColorProperty = new DerivedProperty(
      [
        model.axisStableProperty,
        RigidBodyPrecessionColors.precessionColorProperty,
        RigidBodyPrecessionColors.warningColorProperty,
      ],
      (stable, stableColor, warningColor) => (stable ? stableColor.toCSS() : warningColor.toCSS()),
    );
    const growthValueProperty = new DerivedProperty([model.growthRateProperty], (rate) =>
      rate > 0 ? `${toFixed(rate, 2)} /s` : "—",
    );

    const explanation = new Text(strings.stabilityRuleStringProperty, {
      font: NOTE_FONT,
      fill: RigidBodyPrecessionColors.textColorProperty,
      maxWidth: TORQUE_FREE_PANEL_WIDTH - 40,
      opacity: 0.85,
    });

    const conservedNote = new Text(strings.conservedNoteStringProperty, {
      font: new PhetFont({ size: 10 }),
      fill: RigidBodyPrecessionColors.textColorProperty,
      maxWidth: TORQUE_FREE_PANEL_WIDTH - 40,
      opacity: 0.7,
    });

    const content = new VBox({
      spacing: 10,
      align: "left",
      children: [
        new VBox({ spacing: 4, align: "left", children: [axisLabel, axisComboBox] }),
        spinControl,
        nudgeCheckbox,
        separator,
        readoutHeader,
        readoutRow("axis", stabilityValueProperty, stabilityColorProperty),
        readoutRow("growth", growthValueProperty, RigidBodyPrecessionColors.warningColorProperty),
        readoutRow("T", energyValueProperty, RigidBodyPrecessionColors.textColorProperty),
        readoutRow("|L|", momentumValueProperty, RigidBodyPrecessionColors.textColorProperty),
        conservedNote,
        explanation,
      ],
    });

    super(content, { minWidth: TORQUE_FREE_PANEL_WIDTH });
  }
}
