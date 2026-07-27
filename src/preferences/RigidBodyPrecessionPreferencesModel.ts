/**
 * RigidBodyPrecessionPreferencesModel.ts
 *
 * Model for the simulation-specific preferences shown in Preferences →
 * Simulation. Each preference Property takes its initial value from the
 * corresponding query parameter in rigidBodyPrecessionQueryParameters.
 *
 * Remove the example preference (and its query parameter / UI control) if the
 * sim has no sim-specific preferences.
 */

import { BooleanProperty } from "scenerystack/axon";
import type { Tandem } from "scenerystack/tandem";
import RigidBodyPrecessionNamespace from "../RigidBodyPrecessionNamespace.js";
import rigidBodyPrecessionQueryParameters from "./rigidBodyPrecessionQueryParameters.js";

export class RigidBodyPrecessionPreferencesModel {
  /** Example preference; initial value comes from the `exampleToggle` query parameter. */
  public readonly exampleToggleProperty: BooleanProperty;

  public constructor(tandem?: Tandem) {
    this.exampleToggleProperty = new BooleanProperty(
      rigidBodyPrecessionQueryParameters.exampleToggle,
      tandem ? { tandem: tandem.createTandem("exampleToggleProperty") } : undefined,
    );
  }

  public reset(): void {
    this.exampleToggleProperty.reset();
  }
}

RigidBodyPrecessionNamespace.register("RigidBodyPrecessionPreferencesModel", RigidBodyPrecessionPreferencesModel);
