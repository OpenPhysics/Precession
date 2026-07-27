/**
 * SteadyPrecessionScreenSummaryContent.ts
 */

import { DerivedProperty, PatternStringProperty } from "scenerystack/axon";
import { toFixed } from "scenerystack/dot";
import { ScreenSummaryContent } from "scenerystack/sim";
import { StringManager } from "../../i18n/StringManager.js";
import type { SteadyPrecessionModel } from "../model/SteadyPrecessionModel.js";

export class SteadyPrecessionScreenSummaryContent extends ScreenSummaryContent {
  public constructor(model: SteadyPrecessionModel) {
    const a11y = StringManager.getInstance().getSteadyPrecessionA11yStrings();

    const currentDetails = new PatternStringProperty(a11y.currentDetailsPatternStringProperty, {
      predictedHz: new DerivedProperty([model.predictedPrecessionRateProperty], (rate) =>
        toFixed(rate / (2 * Math.PI), 2),
      ),
      measuredHz: new DerivedProperty([model.measuredPrecessionRateProperty], (rate) =>
        toFixed(rate / (2 * Math.PI), 2),
      ),
    });

    super({
      playAreaContent: a11y.screenSummary.playAreaStringProperty,
      controlAreaContent: a11y.screenSummary.controlAreaStringProperty,
      currentDetailsContent: currentDetails,
      interactionHintContent: a11y.screenSummary.interactionHintStringProperty,
    });
  }
}
