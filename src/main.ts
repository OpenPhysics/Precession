/**
 * main.ts
 */

import "./brand.js";

import { onReadyToLaunch, PreferencesModel, Sim } from "scenerystack/sim";
import { Tandem } from "scenerystack/tandem";
import { StringManager } from "./i18n/StringManager.js";
import { NutationScreen } from "./nutation-screen/NutationScreen.js";
import { RigidBodyPrecessionPreferencesModel } from "./preferences/RigidBodyPrecessionPreferencesModel.js";
import { RigidBodyPrecessionPreferencesNode } from "./preferences/RigidBodyPrecessionPreferencesNode.js";
import RigidBodyPrecessionColors from "./RigidBodyPrecessionColors.js";
import { SteadyPrecessionScreen } from "./steady-precession-screen/SteadyPrecessionScreen.js";
import { TorqueFreeScreen } from "./torque-free-screen/TorqueFreeScreen.js";

onReadyToLaunch(() => {
  const stringManager = StringManager.getInstance();
  const simPreferences = new RigidBodyPrecessionPreferencesModel(Tandem.ROOT.createTandem("preferences"));

  const screens = [
    new SteadyPrecessionScreen({
      tandem: Tandem.ROOT.createTandem("steadyPrecessionScreen"),
      backgroundColorProperty: RigidBodyPrecessionColors.backgroundColorProperty,
    }),
    new NutationScreen({
      tandem: Tandem.ROOT.createTandem("nutationScreen"),
      backgroundColorProperty: RigidBodyPrecessionColors.backgroundColorProperty,
    }),
    new TorqueFreeScreen({
      tandem: Tandem.ROOT.createTandem("torqueFreeScreen"),
      backgroundColorProperty: RigidBodyPrecessionColors.backgroundColorProperty,
    }),
  ];

  const sim = new Sim(stringManager.getTitleStringProperty(), screens, {
    preferencesModel: new PreferencesModel({
      visualOptions: {
        supportsProjectorMode: true,
        supportsInteractiveHighlights: true,
      },
      simulationOptions: {
        customPreferences: [
          {
            createContent: (tandem: Tandem) => new RigidBodyPrecessionPreferencesNode(simPreferences, tandem),
          },
        ],
      },
      localizationOptions: {
        supportsDynamicLocale: true,
      },
    }),
    credits: {
      leadDesign: "",
      softwareDevelopment: "",
      team: "",
      qualityAssurance: "",
    },
  });

  sim.start();
});
