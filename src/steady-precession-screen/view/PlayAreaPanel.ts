/**
 * PlayAreaPanel.ts
 *
 * A titled panel wrapper for play-area sections.
 */

import type { TReadOnlyProperty } from "scenerystack/axon";
import type { Node } from "scenerystack/scenery";
import { Text, VBox } from "scenerystack/scenery";
import { PhetFont } from "scenerystack/scenery-phet";
import { SimPanel } from "../../common/SimPanel.js";
import RigidBodyPrecessionColors from "../../RigidBodyPrecessionColors.js";

const TITLE_FONT = new PhetFont({ size: 13, weight: "bold" });

export class PlayAreaPanel extends SimPanel {
  public constructor(title: TReadOnlyProperty<string> | string, content: Node) {
    const titleNode = new Text(title, {
      font: TITLE_FONT,
      fill: RigidBodyPrecessionColors.accentColorProperty,
    });
    const inner = new VBox({
      spacing: 6,
      align: "left",
      children: [titleNode, content],
    });
    super(inner, { xMargin: 10, yMargin: 10 });
  }
}
