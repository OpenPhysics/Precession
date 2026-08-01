/**
 * SteadyPrecessionScreenView.ts
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
import type { SteadyPrecessionModel } from "../model/SteadyPrecessionModel.js";
import { GyroscopeSceneNode } from "./GyroscopeSceneNode.js";
import { PrecessionAngleGraphNode } from "./PrecessionAngleGraphNode.js";
import { SteadyPrecessionControlPanel } from "./SteadyPrecessionControlPanel.js";
import { SteadyPrecessionScreenSummaryContent } from "./SteadyPrecessionScreenSummaryContent.js";
import { VectorDiagramNode } from "./VectorDiagramNode.js";

const BOTTOM_CHROME_HEIGHT = 56;

export type SteadyPrecessionScreenViewOptions = ScreenViewOptions;

export class SteadyPrecessionScreenView extends ScreenView {
  public constructor(model: SteadyPrecessionModel, providedOptions?: SteadyPrecessionScreenViewOptions) {
    const options = optionize<SteadyPrecessionScreenViewOptions, EmptySelfOptions, ScreenViewOptions>()(
      {
        screenSummaryContent: new SteadyPrecessionScreenSummaryContent(model),
      },
      providedOptions,
    );
    super(options);

    this.addChild(
      new Rectangle(0, 0, this.layoutBounds.width, this.layoutBounds.height, {
        fill: RigidBodyPrecessionColors.backgroundColorProperty,
      }),
    );

    const strings = StringManager.getInstance().getSteadyPrecessionStrings();

    const controlPanel = new SteadyPrecessionControlPanel(model);
    controlPanel.right = this.layoutBounds.maxX - SCREEN_VIEW_MARGIN;
    controlPanel.top = SCREEN_VIEW_MARGIN;

    const playAreaRight = controlPanel.left - SCREEN_VIEW_MARGIN;
    const playAreaWidth = playAreaRight - SCREEN_VIEW_MARGIN;
    const playAreaBottom = this.layoutBounds.maxY - SCREEN_VIEW_MARGIN - BOTTOM_CHROME_HEIGHT;

    const gyroscopePanel = new PlayAreaPanel(strings.gyroscopeTitleStringProperty, new GyroscopeSceneNode(model));
    const vectorPanel = new PlayAreaPanel(strings.vectorDiagramTitleStringProperty, new VectorDiagramNode(model));

    const topRow = new HBox({
      spacing: 8,
      align: "top",
      children: [gyroscopePanel, vectorPanel],
    });

    const graphPanel = new PlayAreaPanel(
      strings.graphTitleStringProperty,
      new PrecessionAngleGraphNode(model, Math.max(300, topRow.width - 66)),
    );

    const timeControl = new TimeControlNode(model.timer.isPlayingProperty, {
      ...TIME_CONTROL_SPEED_RADIO_OPTIONS,
      timeSpeedProperty: model.timeSpeedProperty,
      timeSpeeds: [TimeSpeed.NORMAL, TimeSpeed.SLOW],
      playPauseStepButtonOptions: {
        ...FLAT_PLAY_PAUSE_STEP_BUTTON_OPTIONS,
        stepForwardButtonOptions: {
          ...FLAT_PLAY_PAUSE_STEP_BUTTON_OPTIONS.stepForwardButtonOptions,
          // stepOnce, not step: step-forward has to work while paused.
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

    const playColumn = new VBox({
      spacing: 6,
      align: "left",
      children: [topRow, graphPanel],
    });

    // Scale the whole play column as one piece, so the scene and its graph keep the
    // same width and the panels stay flush no matter how tight the layout gets.
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

    this.addChild(playColumn);
    this.addChild(controlPanel);
    this.addChild(timeControl);
    this.addChild(resetAllButton);

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
