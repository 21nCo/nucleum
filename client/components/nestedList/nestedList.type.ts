export enum NestedListStyle {
  DEFAULT = "DEFAULT",
  OUTLINED = "OUTLINED"
}

export type NestedItemContent = {
  label: string;
  childrenCount: number;
  color?: number;
  icon?: string;
  isIconFilled?: boolean;
};
