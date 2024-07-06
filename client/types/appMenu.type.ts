import type { IObservableStoreSubject } from "./data.type";

export interface IAppMenuStore extends IObservableStoreSubject {
  menu: {
    [key: string]: string[];
  };
}
