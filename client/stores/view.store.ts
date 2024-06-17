import { writable } from "svelte/store";
import { Display, type View } from "../types/view.type";

/**
 * Programmatically set the screen size - Refer tidigit.tailwind.cjs for more details
 * @param width
 * @param height
 * @returns
 */
function calculateScreen(width: number, height: number): Display {
  if (width <= 600 && height <= 1000) {
    return Display.MO;
  } else if (width >= 600 && height >= 800) {
    return Display.TP;
  } else if (width >= 1024 && height >= 800) {
    return Display.DP;
  } else if (width >= 2000 && height >= 1000) {
    return Display.TK;
  } else if (width <= 600) {
    return Display.CW;
  } else if (width >= 4000) {
    return Display.UW;
  } else if (height <= 600) {
    return Display.CH;
  } else if (height >= 1500) {
    return Display.VM;
  } else {
    return Display.DP;
  }
}

const view = initViewStore({
  height: 0,
  width: 0,
  landscapiness: 0,
  scale: 0,
  isPortrait: false,
  firstLoad: new Date().getTime(),
  currentPath: "",
  isMenuHidden: false,
  display: Display.DP
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
        n.display = calculateScreen(width, height);
        n.isPortrait = n.landscapiness < 1;
        return n;
      });
    }
  };
}

export default view;
