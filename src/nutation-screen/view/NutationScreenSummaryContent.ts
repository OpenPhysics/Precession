/**
 * NutationScreenSummaryContent.ts
 */

import { ScreenSummaryContent } from "scenerystack/sim";
import { StringManager } from "../../i18n/StringManager.js";

export class NutationScreenSummaryContent extends ScreenSummaryContent {
  public constructor() {
    const a11y = StringManager.getInstance().getNutationA11yStrings();
    super({
      playAreaContent: a11y.screenSummary.playAreaStringProperty,
      controlAreaContent: a11y.screenSummary.controlAreaStringProperty,
      currentDetailsContent: a11y.currentDetailsStringProperty,
      interactionHintContent: a11y.screenSummary.interactionHintStringProperty,
    });
  }
}
