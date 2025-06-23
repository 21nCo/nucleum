export enum Itemtype {
  YEAR = "YEAR",
  MONTH = "MONTH",
  DAY = "DAY"
}

export enum Modes {
  ZONES = "PART",
  DAYS = "DAY",
  WEEKS = "WEEK",
  MONTHS = "MONTH",
  YEARS = "YEAR"
}

export type ProgrammedHorizontalWheelEvent = {
  deltaX: number;
  isWheelEvent: boolean;
  isPanelEvent?: boolean;
};
export type ProgrammedVerticalWheelEvent = {
  deltaY: number;
  isWheelEvent: boolean;
  isPanelEvent?: boolean;
};
