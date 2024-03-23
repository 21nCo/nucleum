export enum TileAppearance {
  DEFAULT,
  FTile,
  MTile,
  LTile
}

export enum TileScale {
  DAYS = "Days",
  MONTHS = "Months",
  YEARS = "Years"
}

export enum CalendarHmVariant {
  /**
   * Years will shown and user can select a particular year
   */
  YEARS_SWITCH,
  /**
   * Tile scale will be shown as switcher. User can switch between days, months and years
   */
  SCALE_SWITCH,
  /**
   * No switcher will be shown
   */
  PLAIN
}
