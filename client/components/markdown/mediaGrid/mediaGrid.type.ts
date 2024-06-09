export interface Position {
  auto: number;
  columns: {
    index: number;
    columnNo: number;
  };
}

export interface Item {
  id: string;
  URL: string;
  type: string;
  position: Position;
}
export interface Config {
  isWideLayout: boolean;
  isHovered: boolean;
  altText: string;
  type: "AUTO" | "COLUMNS";
  isAutoHighlighted: Boolean;
  isColumnHighlighted: Boolean[];
  isGapSliderEnabled: boolean;
  noOfColumns: number;
  gap: number;
  columns: Array<string>;
  lastColumn: HTMLDivElement | undefined;
  leastItemsInAColumn: number;
  gridWidth: number;
}
