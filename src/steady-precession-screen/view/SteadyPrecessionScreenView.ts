/**
 * SteadyPrecessionScreenView.ts
 *
 * Layout: gyroscope scene + vector diagram on the top row, φ(t) graph below,
 * controls on the right, time control and Reset All along the bottom.
 */

import { HBox, Node, Rectangle, Text, VBox } from "scenerystack/scenery";
import { PhetFont, ResetAllButton, TimeControlNode } from "scenerystack/scenery-phet";
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
import { GYROSCOPE_SCENE_HEIGHT, GyroscopeSceneNode } from "./GyroscopeSceneNode.js";
import { PrecessionAngleGraphNode } from "./PrecessionAngleGraphNode.js";
import { SteadyPrecessionControlPanel } from "./SteadyPrecessionControlPanel.js";
import { SteadyPrecessionScreenSummaryContent } from "./SteadyPrecessionScreenSummaryContent.js";
import { VECTOR_DIAGRAM_HEIGHT, VectorDiagramNode } from "./VectorDiagramNode.js";

export class SteadyPrecessionScreenView extends ScreenView {
  public constructor(model: SteadyPrecessionModel, options?: ScreenViewOptions) {
    super({
      screenSummaryContent: new SteadyPrecessionScreenSummaryContent(model),
      ...options,
    });

    const backgroundRect = new Rectangle(0, 0, this.layoutBounds.width, this.layoutBounds.height, {
      fill: RigidBodyPrecessionColors.backgroundColorProperty,
    });
    this.addChild(backgroundRect);

    const strings = StringManager.getInstance().getSteadyPrecessionStrings();

    const controlPanel = new SteadyPrecessionControlPanel(model);
    controlPanel.right = this.layoutBounds.maxX - SCREEN_VIEW_MARGIN;
    controlPanel.top = SCREEN_VIEW_MARGIN;

    const playAreaRight = controlPanel.left - SCREEN_VIEW_MARGIN;
    const playAreaWidth = playAreaRight - SCREEN_VIEW_MARGIN;

    const gyroscope = new GyroscopeSceneNode(model);
    const vectorDiagram = new VectorDiagramNode(model);

    const topRow = new HBox({
      spacing: 8,
      align: "top",
      children: [gyroscope, vectorDiagram],
      left: SCREEN_VIEW_MARGIN,
      top: SCREEN_VIEW_MARGIN,
    });

    // Scale top row if it overflows the play area
    const topNaturalWidth = GYROSCOPE_SCENE_HEIGHT > 0 ? topRow.bounds.width : playAreaWidth;
    if (topNaturalWidth > playAreaWidth && topNaturalWidth > 0) {
      topRow.setScaleMagnitude(playAreaWidth / topNaturalWidth);
      topRow.left = SCREEN_VIEW_MARGIN;
      topRow.top = SCREEN_VIEW_MARGIN;
    }

    const graphWidth = Math.max(280, playAreaWidth - 50);
    const graphTitle = new Text(strings.graphTitleStringProperty, {
      font: new PhetFont({ size: 14, weight: "bold" }),
      fill: RigidBodyPrecessionColors.textColorProperty,
    });
    const graph = new PrecessionAngleGraphNode(model, graphWidth);

    const graphBlock = new VBox({
      spacing: 4,
      align: "left",
      children: [graphTitle, graph],
      left: SCREEN_VIEW_MARGIN + 24,
      top: Math.max(topRow.bottom, SCREEN_VIEW_MARGIN + Math.max(GYROSCOPE_SCENE_HEIGHT, VECTOR_DIAGRAM_HEIGHT)) + 8,
    });

    const timeControl = new TimeControlNode(model.timer.isPlayingProperty, {
      ...TIME_CONTROL_SPEED_RADIO_OPTIONS,
      playPauseStepButtonOptions: {
        ...FLAT_PLAY_PAUSE_STEP_BUTTON_OPTIONS,
        stepForwardButtonOptions: {
          ...FLAT_PLAY_PAUSE_STEP_BUTTON_OPTIONS.stepForwardButtonOptions,
          listener: () => model.step(1 / 60),
        },
      },
    });
    timeControl.left = SCREEN_VIEW_MARGIN;
    timeControl.bottom = this.layoutBounds.maxY - SCREEN_VIEW_MARGIN;

    const resetAllButton = new ResetAllButton({
      ...FLAT_RESET_ALL_BUTTON_OPTIONS,
      listener: () => {
        model.reset();
        this.reset();
      },
      right: this.layoutBounds.maxX - SCREEN_VIEW_MARGIN,
      bottom: this.layoutBounds.maxY - SCREEN_VIEW_MARGIN,
    });

    this.addChild(topRow);
    this.addChild(graphBlock);
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
    // View has no extra state beyond model-linked nodes.
  }

  public override step(_dt: number): void {
    // Animation is driven by model property updates in Multilinks.
  }
}
