export const NextProduct = {
  FELLOTRON: "fellotron",
  FINATRON: "finatron",
  FEEDTRON: "feedtron",
  SELFTRON: "selftron",
} as const;

export type NextProduct = (typeof NextProduct)[keyof typeof NextProduct];

export enum NextOverviewPanel {
  SELF = "self",
  FINANCE = "finance",
}