import { writable } from "svelte/store";

export interface IBottomModalState {
  isOpen: boolean;
  componentKey: string | null;
  data?: any;
}

const subject = writable<IBottomModalState>({
  isOpen: false,
  componentKey: null,
  data: undefined
});

export const bottomModal = {
  subscribe: subject.subscribe,
  update: subject.update,

  open(componentKey: string, data?: any) {
    subject.set({
      isOpen: true,
      componentKey,
      data
    });
  },

  close() {
    subject.set({
      isOpen: false,
      componentKey: null,
      data: undefined
    });
  }
};
