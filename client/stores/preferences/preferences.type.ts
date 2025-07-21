export type IPreferencesStore = {
  [key: string]: any;
};

export enum Preference {
  TRANSCRIPTION_METHOD = "transcriptionMethod",
  TRANSCRIPTION_MODEL = "transcriptionModel",
  AUTO_TRANSCRIBE = "autoTranscribe",
  TRANSCRIPTION_LANGUAGE = "transcriptionLanguage",
  NOTES_TEMPLATE = "notesTemplate",
  IMPORT_HISTORY = "importHistory"
}

export enum PreferencesScope {
  DEFAULT = "DEFAULT",
  PRODUCT = "PRODUCT"
}

export type IPreferencesParams = {
  scope?: PreferencesScope;
  subVariables?: string[];
};
