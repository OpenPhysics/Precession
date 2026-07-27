/**
 * TorqueFreeScreenSummaryContent.ts
 */

import { ScreenSummaryContent } from "scenerystack/sim";
import { StringManager } from "../../i18n/StringManager.js";

export class TorqueFreeScreenSummaryContent extends ScreenSummaryContent {
  public constructor() {
    const a11y = StringManager.getInstance().getTorqueFreeA11yStrings();
    super({
      playAreaContent: a11y.screenSummary.playAreaStringProperty,
      controlAreaContent: a11y.screenSummary.controlAreaStringProperty,
      currentDetailsContent: a11y.currentDetailsStringProperty,
      interactionHintContent: a11y.screenSummary.interactionHintStringProperty,
    });
  }
}
