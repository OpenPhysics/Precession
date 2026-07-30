/**
 * RigidBodyPrecessionPreferencesNode.ts
 *
 * Custom preferences UI shown in Preferences → Simulation. Controls are bound
 * to RigidBodyPrecessionPreferencesModel Properties (whose initial values come from
 * rigidBodyPrecessionQueryParameters).
 */

import { Text, VBox } from "scenerystack/scenery";
import { PhetFont } from "scenerystack/scenery-phet";
import { Checkbox } from "scenerystack/sun";
import type { Tandem } from "scenerystack/tandem";
import { StringManager } from "../i18n/StringManager.js";
import RigidBodyPrecessionColors from "../RigidBodyPrecessionColors.js";
import RigidBodyPrecessionNamespace from "../RigidBodyPrecessionNamespace.js";
import type { RigidBodyPrecessionPreferencesModel } from "./RigidBodyPrecessionPreferencesModel.js";

export class RigidBodyPrecessionPreferencesNode extends VBox {
  public constructor(preferencesModel: RigidBodyPrecessionPreferencesModel, tandem?: Tandem) {
    const prefStrings = StringManager.getInstance().getPreferences();

    // The Preferences dialog is always white, so use the dark "light control surface"
    // colors (readable on white in both default and projector profiles), not textColorProperty
    // (which is near-white in default mode and would be invisible on the white dialog).
    const header = new Text(prefStrings.titleStringProperty, {
      font: new PhetFont({ size: 18, weight: "bold" }),
      fill: RigidBodyPrecessionColors.controlSurfaceTextColorProperty,
    });

    const exampleToggleCheckbox = new Checkbox(
      preferencesModel.exampleToggleProperty,
      new Text(prefStrings.exampleToggleStringProperty, {
        font: new PhetFont(14),
        fill: RigidBodyPrecessionColors.controlSurfaceTextColorProperty,
      }),
      {
        checkboxColor: RigidBodyPrecessionColors.controlSurfaceTextColorProperty,
        checkboxColorBackground: RigidBodyPrecessionColors.controlSurfaceColorProperty,
        spacing: 8,
        ...(tandem && { tandem: tandem.createTandem("exampleToggleCheckbox") }),
      },
    );

    super({
      align: "left",
      spacing: 12,
      children: [header, exampleToggleCheckbox],
    });
  }
}

RigidBodyPrecessionNamespace.register("RigidBodyPrecessionPreferencesNode", RigidBodyPrecessionPreferencesNode);
