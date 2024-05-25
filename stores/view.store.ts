import { writable } from "svelte/store";
import type { View } from "../types/view.type";

const view = initViewStore({
  height: 0,
  width: 0,
  landscapiness: 0,
  scale: 0,
  isPortrait: false,
  firstLoad: new Date().getTime(),
  currentPath: "",
  isMenuHidden: false
});

function initViewStore(settings: View) {
  const { subscribe, set, update } = writable<View>(settings);
  return {
    subscribe,
    set,
    reset: (view: View) => {
      set(view);
    },
    update: (width: number, height: number) => {
      update((n: View) => {
        n = {
          ...n,
          height: height,
          width: width,
          landscapiness: width / height,
          scale: (width / 1000 + height / 1000) / 2,
          isPortrait: false
        };
        n.isPortrait = n.landscapiness < 1;
        return n;
      });
    }
  };
}

export default view;
