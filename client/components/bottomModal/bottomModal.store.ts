import { writable } from "svelte/store";

export interface IBottomModalState {
  isOpen: boolean;
  componentKey: string | null;
  data?: any;
}

class BottomModalStore {
  protected subject = writable<IBottomModalState>({
    isOpen: false,
    componentKey: null,
    data: undefined
  });
  subscribe = this.subject.subscribe;
  update = this.subject.update;
  protected _set = this.subject.set;

  open(componentKey: string, data?: any) {
    this._set({
      isOpen: true,
      componentKey,
      data
    });
  }

  close() {
    this._set({
      isOpen: false,
      componentKey: null,
      data: undefined
    });
  }
}

export const bottomModal = new BottomModalStore();
