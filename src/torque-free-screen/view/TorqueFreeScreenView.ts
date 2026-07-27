/**
 * TorqueFreeScreenView.ts — placeholder until Screen 3 is implemented.
 */

import { Rectangle, Text } from "scenerystack/scenery";
import { ResetAllButton } from "scenerystack/scenery-phet";
import type { ScreenViewOptions } from "scenerystack/sim";
import { ScreenView } from "scenerystack/sim";
import { FLAT_RESET_ALL_BUTTON_OPTIONS } from "../../common/SimButtonOptions.js";
import { StringManager } from "../../i18n/StringManager.js";
import RigidBodyPrecessionColors from "../../RigidBodyPrecessionColors.js";
import { SCREEN_VIEW_MARGIN } from "../../RigidBodyPrecessionConstants.js";
import type { TorqueFreeModel } from "../model/TorqueFreeModel.js";
import { TorqueFreeScreenSummaryContent } from "./TorqueFreeScreenSummaryContent.js";

export class TorqueFreeScreenView extends ScreenView {
  public constructor(model: TorqueFreeModel, options?: ScreenViewOptions) {
    super({
      screenSummaryContent: new TorqueFreeScreenSummaryContent(),
      ...options,
    });

    this.addChild(
      new Rectangle(0, 0, this.layoutBounds.width, this.layoutBounds.height, {
        fill: RigidBodyPrecessionColors.backgroundColorProperty,
      }),
    );

    const placeholder = new Text(StringManager.getInstance().getTorqueFreeStrings().placeholderStringProperty, {
      font: "24px sans-serif",
      fill: RigidBodyPrecessionColors.textColorProperty,
      center: this.layoutBounds.center,
      maxWidth: this.layoutBounds.width - 80,
    });
    this.addChild(placeholder);

    const resetAllButton = new ResetAllButton({
      ...FLAT_RESET_ALL_BUTTON_OPTIONS,
      listener: () => {
        model.reset();
        this.reset();
      },
      right: this.layoutBounds.maxX - SCREEN_VIEW_MARGIN,
      bottom: this.layoutBounds.maxY - SCREEN_VIEW_MARGIN,
    });
    this.addChild(resetAllButton);
  }

  public reset(): void {
    // No view-local state on the placeholder screen.
  }
}
