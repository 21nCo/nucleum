import type { IObservableStoreSubject } from "./data.type";

export type IAppMenuStore = IObservableStoreSubject & {
  [key: string]: Menu;
};
type Menu = {
  default: string[];
  user: string[];
};
