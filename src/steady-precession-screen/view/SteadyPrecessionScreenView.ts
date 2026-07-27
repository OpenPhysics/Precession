/**
 * SteadyPrecessionScreenView.ts
 */

import { HBox, Node, Rectangle, VBox } from "scenerystack/scenery";
import { ResetAllButton, TimeControlNode } from "scenerystack/scenery-phet";
import type { ScreenViewOptions } from "scenerystack/sim";
import { ScreenView } from "scenerystack/sim";
import {
  FLAT_PLAY_PAUSE_STEP_BUTTON_OPTIONS,
  FLAT_RESET_ALL_BUTTON_OPTIONS,
  TIME_CONTROL_SPEED_RADIO_OPTIONS,
} from "../../common/SimButtonOptions.js";
import { StringManager } from "../../i18n/StringManager.js";
import RigidBodyPrecessionColors from "../../RigidBodyPrecessionColors.js";
import { SCREEN_VIEW_MARGIN } from "../../RigidBodyPrecessionConstants.js";
import type { SteadyPrecessionModel } from "../model/SteadyPrecessionModel.js";
import { GyroscopeSceneNode } from "./GyroscopeSceneNode.js";
import { PlayAreaPanel } from "./PlayAreaPanel.js";
import { PrecessionAngleGraphNode } from "./PrecessionAngleGraphNode.js";
import { SteadyPrecessionControlPanel } from "./SteadyPrecessionControlPanel.js";
import { SteadyPrecessionScreenSummaryContent } from "./SteadyPrecessionScreenSummaryContent.js";
import { VectorDiagramNode } from "./VectorDiagramNode.js";

const BOTTOM_CHROME_HEIGHT = 56;

export class SteadyPrecessionScreenView extends ScreenView {
  public constructor(model: SteadyPrecessionModel, options?: ScreenViewOptions) {
    super({
      screenSummaryContent: new SteadyPrecessionScreenSummaryContent(model),
      ...options,
    });

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
      spacing: 10,
      align: "top",
      children: [gyroscopePanel, vectorPanel],
    });

    // Fit top row into available width
    if (topRow.width > playAreaWidth && topRow.width > 0) {
      topRow.setScaleMagnitude(playAreaWidth / topRow.width);
    }
    topRow.left = SCREEN_VIEW_MARGIN;
    topRow.top = SCREEN_VIEW_MARGIN;

    const graphPanel = new PlayAreaPanel(
      strings.graphTitleStringProperty,
      new PrecessionAngleGraphNode(model, Math.max(300, playAreaWidth - 40)),
    );
    graphPanel.left = SCREEN_VIEW_MARGIN;
    graphPanel.top = topRow.bounds.bottom + 6;

    // Shrink graph if it would overlap bottom chrome
    const graphOverflow = graphPanel.bounds.bottom - playAreaBottom;
    if (graphOverflow > 0 && graphPanel.height > 0) {
      const shrink = (graphPanel.height - graphOverflow) / graphPanel.height;
      graphPanel.setScaleMagnitude(Math.max(0.65, shrink));
      graphPanel.left = SCREEN_VIEW_MARGIN;
      graphPanel.top = topRow.bounds.bottom + 6;
    }

    const timeControl = new TimeControlNode(model.timer.isPlayingProperty, {
      ...TIME_CONTROL_SPEED_RADIO_OPTIONS,
      playPauseStepButtonOptions: {
        ...FLAT_PLAY_PAUSE_STEP_BUTTON_OPTIONS,
        stepForwardButtonOptions: {
          ...FLAT_PLAY_PAUSE_STEP_BUTTON_OPTIONS.stepForwardButtonOptions,
          listener: () => model.step(1 / 60),
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
      spacing: 0,
      align: "left",
      children: [topRow, graphPanel],
    });

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
