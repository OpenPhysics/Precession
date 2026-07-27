/**
 * StringManager.ts
 */

import type { ReadOnlyProperty } from "scenerystack/axon";
import { LocalizedString } from "scenerystack/chipper";
import stringsEn from "./strings_en.json";
import stringsEs from "./strings_es.json";
import stringsFr from "./strings_fr.json";

// biome-ignore lint/complexity/noVoid: intentional compile-time type assertion
void (stringsFr satisfies typeof stringsEn);
// biome-ignore lint/complexity/noVoid: intentional compile-time type assertion
void (stringsEn satisfies typeof stringsFr);
// biome-ignore lint/complexity/noVoid: intentional compile-time type assertion
void (stringsEs satisfies typeof stringsEn);
// biome-ignore lint/complexity/noVoid: intentional compile-time type assertion
void (stringsEn satisfies typeof stringsEs);

const stringProperties = LocalizedString.getNestedStringProperties({
  en: stringsEn,
  fr: stringsFr,
  es: stringsEs,
});

export class StringManager {
  private static instance: StringManager | null = null;

  private constructor() {}

  public static getInstance(): StringManager {
    if (StringManager.instance === null) {
      StringManager.instance = new StringManager();
    }
    return StringManager.instance;
  }

  public getTitleStringProperty(): ReadOnlyProperty<string> {
    return stringProperties.titleStringProperty;
  }

  public getScreenNames(): {
    readonly steadyPrecessionStringProperty: ReadOnlyProperty<string>;
    readonly nutationStringProperty: ReadOnlyProperty<string>;
    readonly torqueFreeStringProperty: ReadOnlyProperty<string>;
  } {
    return {
      steadyPrecessionStringProperty: stringProperties.screens.steadyPrecessionStringProperty,
      nutationStringProperty: stringProperties.screens.nutationStringProperty,
      torqueFreeStringProperty: stringProperties.screens.torqueFreeStringProperty,
    };
  }

  public getSteadyPrecessionStrings() {
    return stringProperties.steadyPrecession;
  }

  public getSteadyPrecessionA11yStrings() {
    return stringProperties.a11y.steadyPrecession;
  }

  public getNutationStrings() {
    return stringProperties.nutation;
  }

  public getNutationA11yStrings() {
    return stringProperties.a11y.nutation;
  }

  public getTorqueFreeStrings() {
    return stringProperties.torqueFree;
  }

  public getTorqueFreeA11yStrings() {
    return stringProperties.a11y.torqueFree;
  }

  public getPreferences() {
    return stringProperties.preferences;
  }
}
