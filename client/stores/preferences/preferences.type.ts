import type { ImportHistoryItem } from "$lib/client/products/memotron/import/data.type";

export interface IPreferencesStore {
  [Preference.TRANSCRIPTION_METHOD]?: string;
  [Preference.TRANSCRIPTION_MODEL]?: string;
  [Preference.AUTO_TRANSCRIBE]?: boolean;
  [Preference.TRANSCRIPTION_LANGUAGE]?: string;
  [Preference.NOTES_TEMPLATE]?: string;
  [Preference.IMPORT_HISTORY]?: ImportHistoryItem[];
  [Preference.CALENDAR_TILE_INDICATORS_MONTH]?: boolean;
  [Preference.CALENDAR_TILE_INDICATORS_YEAR]?: boolean;
  [key: string]: unknown;
}

export enum Preference {
  TRANSCRIPTION_METHOD = "transcriptionMethod",
  TRANSCRIPTION_MODEL = "transcriptionModel",
  AUTO_TRANSCRIBE = "autoTranscribe",
  TRANSCRIPTION_LANGUAGE = "transcriptionLanguage",
  NOTES_TEMPLATE = "notesTemplate",
  IMPORT_HISTORY = "importHistory",
  CALENDAR_TILE_INDICATORS_MONTH = "calendarTileIndicatorsMonth",
  CALENDAR_TILE_INDICATORS_YEAR = "calendarTileIndicatorsYear"
}

export enum PreferencesScope {
  DEFAULT = "DEFAULT",
  PRODUCT = "PRODUCT"
}

export type IPreferencesParams = {
  scope?: PreferencesScope;
  subVariables?: string[];
};
