/**
 * TorqueFreeScreen.ts
 */

import { type EmptySelfOptions, optionize } from "scenerystack/phet-core";
import { Screen, type ScreenOptions } from "scenerystack/sim";
import { createTorqueFreeIcon } from "../common/RigidBodyPrecessionScreenIcons.js";
import { StringManager } from "../i18n/StringManager.js";
import RigidBodyPrecessionColors from "../RigidBodyPrecessionColors.js";
import { TorqueFreeModel } from "./model/TorqueFreeModel.js";
import { TorqueFreeKeyboardHelpContent } from "./view/TorqueFreeKeyboardHelpContent.js";
import { TorqueFreeScreenView } from "./view/TorqueFreeScreenView.js";

export class TorqueFreeScreen extends Screen<TorqueFreeModel, TorqueFreeScreenView> {
  public constructor(options: ScreenOptions) {
    super(
      () => new TorqueFreeModel(),
      (model) => new TorqueFreeScreenView(model),
      optionize<ScreenOptions, EmptySelfOptions, ScreenOptions>()(
        {
          name: StringManager.getInstance().getScreenNames().torqueFreeStringProperty,
          backgroundColorProperty: RigidBodyPrecessionColors.backgroundColorProperty,
          createKeyboardHelpNode: () => new TorqueFreeKeyboardHelpContent(),
          homeScreenIcon: createTorqueFreeIcon(),
          navigationBarIcon: createTorqueFreeIcon(),
        },
        options,
      ),
    );
  }
}
