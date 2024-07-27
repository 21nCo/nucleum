export enum Itemtype {
  YEAR = "YEAR",
  MONTH = "MONTH",
  DAY = "DAY"
}

export enum Modes {
  ZONES = "Zones",
  DAYS = "Days",
  MONTHS = "Months",
  YEARS = "Years"
}

export type ProgrammedHorizontalWheelEvent = { deltaX: number;isWheelEvent: boolean;isPanelEvent?:boolean; };
export type ProgrammedVerticalWheelEvent = { deltaY: number;isWheelEvent: boolean;isPanelEvent?:boolean; };