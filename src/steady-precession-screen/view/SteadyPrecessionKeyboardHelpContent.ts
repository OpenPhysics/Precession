/**
 * SteadyPrecessionKeyboardHelpContent.ts
 */

import {
  BasicActionsKeyboardHelpSection,
  SliderControlsKeyboardHelpSection,
  TwoColumnKeyboardHelpContent,
} from "scenerystack/scenery-phet";

export class SteadyPrecessionKeyboardHelpContent extends TwoColumnKeyboardHelpContent {
  public constructor() {
    super([new BasicActionsKeyboardHelpSection(), new SliderControlsKeyboardHelpSection()], []);
  }
}
