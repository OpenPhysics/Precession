/**
 * TorqueFreeScreenSummaryContent.ts
 *
 * Live accessible summary of the tumbling block: the three body-frame spin
 * components about the largest, intermediate, and smallest inertia axes.
 */

import { DerivedProperty, PatternStringProperty } from "scenerystack/axon";
import { toFixed } from "scenerystack/dot";
import { ScreenSummaryContent } from "scenerystack/sim";
import { StringManager } from "../../i18n/StringManager.js";
import type { TorqueFreeModel } from "../model/TorqueFreeModel.js";

export class TorqueFreeScreenSummaryContent extends ScreenSummaryContent {
  public constructor(model: TorqueFreeModel) {
    const a11y = StringManager.getInstance().getTorqueFreeA11yStrings();

    const currentDetails = new PatternStringProperty(a11y.currentDetailsPatternStringProperty, {
      omega1: new DerivedProperty([model.omegaProperty], (omega) => toFixed(omega.x, 2)),
      omega2: new DerivedProperty([model.omegaProperty], (omega) => toFixed(omega.y, 2)),
      omega3: new DerivedProperty([model.omegaProperty], (omega) => toFixed(omega.z, 2)),
    });

    super({
      playAreaContent: a11y.screenSummary.playAreaStringProperty,
      controlAreaContent: a11y.screenSummary.controlAreaStringProperty,
      currentDetailsContent: currentDetails,
      interactionHintContent: a11y.screenSummary.interactionHintStringProperty,
    });
  }
}
