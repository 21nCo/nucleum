import type { IObservableStoreSubject } from "$lib/client/types/data.type";

export type IPreferencesStore = IObservableStoreSubject & {
  [key: string]: any;
};

export enum Preference {
  TRANSCRIPTION_METHOD = "transcriptionMethod",
  TRANSCRIPTION_MODEL = "transcriptionModel",
  AUTO_TRANSCRIBE = "autoTranscribe",
  TRANSCRIPTION_LANGUAGE = "transcriptionLanguage"
}

export enum PreferencesScope {
  DEFAULT = "DEFAULT",
  PRODUCT = "PRODUCT"
}

export type IPreferencesParams = {
  scope?: PreferencesScope;
  subVariables?: string[];
};
