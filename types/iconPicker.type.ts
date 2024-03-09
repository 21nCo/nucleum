export type avatarWithCode = [
  {
    name: string;
    code: string;
    frequency: number;
  }
];

export type avatarWithURL = [
  {
    name: string;
    URL: string;
    frequency: number;
  }
];

export enum iconPickerType {
  EMOJI = "EMOJI",
  ICON = "ICON"
}
