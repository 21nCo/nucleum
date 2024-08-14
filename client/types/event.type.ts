import { IObservableStoreSubject } from "./data.type";
import type { Event } from "./event.enum";

export type IEvent = IObservableStoreSubject & {
  event: Event;
  value: any;
};
