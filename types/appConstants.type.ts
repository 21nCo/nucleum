export type AppConstants = {
    appModes: string[];
    themes: string[];
    colorSchemes: ColorScheme[];
    focusPlaceholderText: string[];
    runningOutDuration: number;
}

export type ColorScheme = {
    label: string;
    theme: string;
    isDark: boolean;
    bgs1?: string;
    bgs2?: string;
    bgs3?: string;
    bgs4?: string;
    texts1?: string;
    texts2?: string;
    texts3?: string;
    accent1?: string;
    accent2?: string;
    accent3?: string;
    red?: string;
    green?: string;
}