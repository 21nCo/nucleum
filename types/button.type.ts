export enum ButtonStyle {
  DEFAULT = "default",
  PLAIN = "plain",
  ROUNDED = "rounded",
}

export type ButtonType = {
  label: string;
  icon?: string;
  action: () => void;
  type?: string;
};
