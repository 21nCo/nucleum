export type UserLocalPreferences = {
  appMenu: string[];
  uiStates?: {
    all: LocalUiState;
    desktop: LocalUiState;
    portrait: LocalUiState;
  };
};

type LocalUiState = {
  advancedMode: number;
};
