import type { IObservableStoreSubject } from "../../types/data.type";

export type IAppMenuStore = IObservableStoreSubject & {
  [key: string]: Menu;
};
type Menu = {
  default: string[];
  user: string[];
};
