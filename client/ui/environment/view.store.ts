import { get, writable } from "svelte/store";
import { Display } from "@21n/ui/elements/display.enum";
import { type IViewStore } from "@21n/ui/environment/view.type";

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

class ViewStore {
  private readonly subject = writable<IViewStore>({
    height: 0,
    width: 0,
    landscapiness: 0,
    scale: 1,
    isPortrait: false,
    firstLoad: Date.now(),
    display: Display.DP,
    isConstrainedWidth: false
  });
  subscribe = this.subject.subscribe;

  constructor() {
    if (typeof window !== "undefined")
      this.refresh(window.innerWidth, window.innerHeight);
    else this.refresh(1080, 900);
  }

  get() {
    return get(this.subject);
  }

  set(value: IViewStore) {
    this.subject.set(value);
  }

  reset(view: IViewStore) {
    this.set(view);
  }

  refresh(width: number, height: number) {
    this.subject.update((current) => {
      const next = {
        ...current,
        height: height,
        width: width,
        landscapiness: width / height,
        scale: (width / 1000 + height / 1000) / 2,
        isPortrait: false,
        isConstrainedWidth: width <= 800
      };
      next.display = calculateScreen(width, height);
      next.isPortrait = next.landscapiness < 1;
      return next;
    });
  }
}

const view = new ViewStore();
export default view;
