/**
 * NutationScreenView.ts
 *
 * Layout for Screen 2: the top and its tip trace on the left, θ(t) below it, and
 * the launch controls on the right.
 */

import { type EmptySelfOptions, optionize } from "scenerystack/phet-core";
import { HBox, Node, Rectangle, VBox } from "scenerystack/scenery";
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
import type { NutationModel } from "../model/NutationModel.js";
import { NutationAngleGraphNode } from "./NutationAngleGraphNode.js";
import { NutationControlPanel } from "./NutationControlPanel.js";
import { NutationScreenSummaryContent } from "./NutationScreenSummaryContent.js";
import { TipPathViewNode } from "./TipPathViewNode.js";
import { TopSceneNode } from "./TopSceneNode.js";

const BOTTOM_CHROME_HEIGHT = 56;

export type NutationScreenViewOptions = ScreenViewOptions;

export class NutationScreenView extends ScreenView {
  public constructor(model: NutationModel, providedOptions?: NutationScreenViewOptions) {
    const options = optionize<NutationScreenViewOptions, EmptySelfOptions, ScreenViewOptions>()(
      {
        screenSummaryContent: new NutationScreenSummaryContent(model),
      },
      providedOptions,
    );
    super(options);

    this.addChild(
      new Rectangle(0, 0, this.layoutBounds.width, this.layoutBounds.height, {
        fill: RigidBodyPrecessionColors.backgroundColorProperty,
      }),
    );

    const strings = StringManager.getInstance().getNutationStrings();

    // The combo-box list must sit above every other node in the view.
    const comboBoxListParent = new Node();

    const controlPanel = new NutationControlPanel(model, comboBoxListParent);
    controlPanel.right = this.layoutBounds.maxX - SCREEN_VIEW_MARGIN;
    controlPanel.top = SCREEN_VIEW_MARGIN;

    const playAreaRight = controlPanel.left - SCREEN_VIEW_MARGIN;
    const playAreaWidth = playAreaRight - SCREEN_VIEW_MARGIN;
    const playAreaBottom = this.layoutBounds.maxY - SCREEN_VIEW_MARGIN - BOTTOM_CHROME_HEIGHT;

    const scenePanel = new PlayAreaPanel(strings.sceneTitleStringProperty, new TopSceneNode(model));
    const tipPathPanel = new PlayAreaPanel(strings.tipPathTitleStringProperty, new TipPathViewNode(model));

    // The sphere view and the flattened view of the same path, side by side: the
    // 3-D one shows where the top is, the flat one shows what the path is called.
    const topRow = new HBox({
      spacing: 8,
      align: "top",
      children: [scenePanel, tipPathPanel],
    });

    const graphPanel = new PlayAreaPanel(
      strings.graphTitleStringProperty,
      new NutationAngleGraphNode(model, Math.max(280, topRow.width - 74)),
    );

    const playColumn = new VBox({
      spacing: 6,
      align: "left",
      children: [topRow, graphPanel],
    });

    // Scale the column down if the two panels together overflow the play area.
    const availableHeight = playAreaBottom - SCREEN_VIEW_MARGIN;
    const widthScale = playColumn.width > playAreaWidth ? playAreaWidth / playColumn.width : 1;
    const heightScale = playColumn.height > availableHeight ? availableHeight / playColumn.height : 1;
    const scale = Math.min(widthScale, heightScale);
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

    this.addChild(
      new Node({
        pdomOrder: [controlPanel, timeControl, resetAllButton],
      }),
    );
  }

  public reset(): void {
    // View state is model-driven; nothing extra to reset.
  }

  public override step(_dt: number): void {
    // Animation updates via Multilink on model properties.
  }
}
