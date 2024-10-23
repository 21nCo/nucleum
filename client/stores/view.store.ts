import { writable } from "svelte/store";
import { Display, type View } from "../types/view.type";

/**
 * Programmatically set the screen size - Refer tidigit.tailwind.cjs for more details
 * @param width
 * @param height
 * @returns
 */
function calculateScreen(width: number, height: number): Display {
  let display: Display = Display.DP;
  if (width <= 600 && height <= 1000) {
    display = Display.MO;
  }
  if (width >= 600 && height >= 500) {
    display = Display.TP;
  }
  if (width >= 1024 && height >= 700) {
    display = Display.LP;
  }
  if (width >= 1500 && height >= 700) {
    display = Display.DP;
  }
  if (width >= 2000 && height >= 1000) {
    display = Display.TK;
  }
  if (width <= 600) {
    display = Display.CW;
  }
  if (width >= 4000) {
    display = Display.UW;
  }
  if (height <= 600) {
    display = Display.CH;
  }
  if (height >= 1500) {
    display = Display.VM;
  }
  return display;
}

const view = initViewStore({
  height: 0,
  width: 0,
  landscapiness: 0,
  scale: 1,
  isPortrait: false,
  firstLoad: new Date().getTime(),
  currentPath: "",
  isMenuHidden: false,
  display: Display.DP,
  isConstrainedWidth: false
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
          isPortrait: false,
          isConstrainedWidth: width <= 800
        };
        n.display = calculateScreen(width, height);
        n.isPortrait = n.landscapiness < 1;
        return n;
      });
    }
  };
}

export default view;
