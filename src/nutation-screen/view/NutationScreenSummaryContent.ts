/**
 * NutationScreenSummaryContent.ts
 *
 * Live accessible summary of the top's state: where the axis is, how wide the
 * nutation band is, and how fast it is precessing on average.
 */

import { DerivedProperty, PatternStringProperty } from "scenerystack/axon";
import { toFixed } from "scenerystack/dot";
import { ScreenSummaryContent } from "scenerystack/sim";
import { StringManager } from "../../i18n/StringManager.js";
import type { NutationModel } from "../model/NutationModel.js";

const DEGREES_PER_RADIAN = 180 / Math.PI;
const HZ_PER_RAD_S = 1 / (2 * Math.PI);

export class NutationScreenSummaryContent extends ScreenSummaryContent {
  public constructor(model: NutationModel) {
    const a11y = StringManager.getInstance().getNutationA11yStrings();

    const currentDetails = new PatternStringProperty(a11y.currentDetailsPatternStringProperty, {
      tilt: new DerivedProperty([model.thetaProperty], (theta) => toFixed(theta * DEGREES_PER_RADIAN, 0)),
      thetaMin: new DerivedProperty([model.nutationBandProperty], (band) =>
        toFixed(band.thetaMin * DEGREES_PER_RADIAN, 0),
      ),
      thetaMax: new DerivedProperty([model.nutationBandProperty], (band) =>
        toFixed(band.thetaMax * DEGREES_PER_RADIAN, 0),
      ),
      precessionHz: new DerivedProperty([model.meanPrecessionRateProperty], (rate) => toFixed(rate * HZ_PER_RAD_S, 2)),
      nutationHz: new DerivedProperty([model.nutationFrequencyProperty], (rate) => toFixed(rate * HZ_PER_RAD_S, 2)),
    });

    super({
      playAreaContent: a11y.screenSummary.playAreaStringProperty,
      controlAreaContent: a11y.screenSummary.controlAreaStringProperty,
      currentDetailsContent: currentDetails,
      interactionHintContent: a11y.screenSummary.interactionHintStringProperty,
    });
  }
}
