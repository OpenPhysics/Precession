/**
 * TorqueFreeScreenView.ts
 *
 * Layout for Screen 3: the tumbling block with its two vectors, and ω(t) beneath it.
 */

import { type EmptySelfOptions, optionize } from "scenerystack/phet-core";
import { Node, Rectangle, VBox } from "scenerystack/scenery";
import { ResetAllButton, TimeControlNode, TimeSpeed } from "scenerystack/scenery-phet";
import { ScreenView, type ScreenViewOptions } from "scenerystack/sim";
import {
  FLAT_PLAY_PAUSE_STEP_BUTTON_OPTIONS,
  FLAT_RESET_ALL_BUTTON_OPTIONS,
  TIME_CONTROL_SPEED_RADIO_OPTIONS,
} from "../../common/SimButtonOptions.js";
import { PlayAreaPanel } from "../../common/view/PlayAreaPanel.js";
import { StringManager } from "../../i18n/StringManager.js";
import RigidBodyPrecessionColors from "../../RigidBodyPrecessionColors.js";
import { SCREEN_VIEW_MARGIN } from "../../RigidBodyPrecessionConstants.js";
import type { TorqueFreeModel } from "../model/TorqueFreeModel.js";
import { OmegaGraphNode } from "./OmegaGraphNode.js";
import { TorqueFreeControlPanel } from "./TorqueFreeControlPanel.js";
import { TorqueFreeScreenSummaryContent } from "./TorqueFreeScreenSummaryContent.js";
import { TUMBLE_SCENE_WIDTH, TumbleSceneNode } from "./TumbleSceneNode.js";

const BOTTOM_CHROME_HEIGHT = 56;

export type TorqueFreeScreenViewOptions = ScreenViewOptions;

export class TorqueFreeScreenView extends ScreenView {
  public constructor(model: TorqueFreeModel, providedOptions?: TorqueFreeScreenViewOptions) {
    const options = optionize<TorqueFreeScreenViewOptions, EmptySelfOptions, ScreenViewOptions>()(
      {
        screenSummaryContent: new TorqueFreeScreenSummaryContent(model),
      },
      providedOptions,
    );
    super(options);

    this.addChild(
      new Rectangle(0, 0, this.layoutBounds.width, this.layoutBounds.height, {
        fill: RigidBodyPrecessionColors.backgroundColorProperty,
      }),
    );

    const strings = StringManager.getInstance().getTorqueFreeStrings();
    const comboBoxListParent = new Node();

    const controlPanel = new TorqueFreeControlPanel(model, comboBoxListParent);
    controlPanel.right = this.layoutBounds.maxX - SCREEN_VIEW_MARGIN;
    controlPanel.top = SCREEN_VIEW_MARGIN;

    const playAreaWidth = controlPanel.left - 2 * SCREEN_VIEW_MARGIN;
    const playAreaBottom = this.layoutBounds.maxY - SCREEN_VIEW_MARGIN - BOTTOM_CHROME_HEIGHT;

    const scenePanel = new PlayAreaPanel(strings.sceneTitleStringProperty, new TumbleSceneNode(model));
    const graphPanel = new PlayAreaPanel(
      strings.graphTitleStringProperty,
      new OmegaGraphNode(model, Math.max(320, TUMBLE_SCENE_WIDTH - 50)),
    );

    const playColumn = new VBox({ spacing: 6, align: "left", children: [scenePanel, graphPanel] });

    const availableHeight = playAreaBottom - SCREEN_VIEW_MARGIN;
    const scale = Math.min(
      1,
      playColumn.width > 0 ? playAreaWidth / playColumn.width : 1,
      playColumn.height > 0 ? availableHeight / playColumn.height : 1,
    );
    if (scale < 1) {
      playColumn.setScaleMagnitude(scale);
    }
    playColumn.left = SCREEN_VIEW_MARGIN;
    playColumn.top = SCREEN_VIEW_MARGIN;

    const timeControl = new TimeControlNode(model.timer.isPlayingProperty, {
      ...TIME_CONTROL_SPEED_RADIO_OPTIONS,
      timeSpeedProperty: model.timeSpeedProperty,
      timeSpeeds: [TimeSpeed.NORMAL, TimeSpeed.SLOW],
      playPauseStepButtonOptions: {
        ...FLAT_PLAY_PAUSE_STEP_BUTTON_OPTIONS,
        stepForwardButtonOptions: {
          ...FLAT_PLAY_PAUSE_STEP_BUTTON_OPTIONS.stepForwardButtonOptions,
          listener: () => model.stepOnce(1 / 60),
        },
      },
      left: SCREEN_VIEW_MARGIN,
      bottom: this.layoutBounds.maxY - SCREEN_VIEW_MARGIN,
    });

    const resetAllButton = new ResetAllButton({
      ...FLAT_RESET_ALL_BUTTON_OPTIONS,
      listener: () => {
        model.reset();
        this.reset();
      },
      right: this.layoutBounds.maxX - SCREEN_VIEW_MARGIN,
      bottom: this.layoutBounds.maxY - SCREEN_VIEW_MARGIN,
    });

    this.addChild(playColumn);
    this.addChild(controlPanel);
    this.addChild(timeControl);
    this.addChild(resetAllButton);
    this.addChild(comboBoxListParent);

    this.addChild(new Node({ pdomOrder: [controlPanel, timeControl, resetAllButton] }));
  }

  public reset(): void {
    // View state is model-driven; nothing extra to reset.
  }

  public override step(_dt: number): void {
    // Animation updates via Multilink on model properties.
  }
}
