import { writable } from "svelte/store";
import type { View } from "../types/view.type";
import { resolveComponentFromPath } from "../utils/utils";
import { goto } from "$app/navigation";
import { logger } from "./log.store";
import { appStore } from "./app.store";

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

/**
 * Determines whether the app menu should be hidden for a path
 * @param newPath path which needs to checked
 * @param n view
 * @returns a boolean whether app menu should be hidden or not
 */
function checkIfNeedToHideMenu(newPath: string, n: View) {
  const path = newPath.split("?")[0];
  if (path.split("/")[1]) {
    let component = resolveComponentFromPath(path.split("/")[1]);
    if (component?.isMenuHidden) return true;
  }
  const listOfPathsToHideMenu = {
    portrait: ["/goals/*", "/cp/*"],
    landscape: []
  };
  if (!path) return false;
  let pathParts = path.split("/").filter((p) => p);
  if (n.isPortrait) {
    if (listOfPathsToHideMenu.portrait.includes(path)) return true;
    //currently only supports one level deep, but can be extended to support more
    else if (
      pathParts.length > 1 &&
      listOfPathsToHideMenu.portrait.includes(`/${pathParts[0]}/*`)
    )
      return true;
  } else {
    //check for landscape
  }
  return false;
}

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
    },
    toggleMenuVisibility: (isHidden?: boolean) => {
      update((n: View) => {
        if (isHidden !== undefined && isHidden !== null) {
          n = { ...n, isMenuHidden: isHidden };
        } else {
          n = { ...n, isMenuHidden: !n.isMenuHidden };
        }
        return n;
      });
    },
    toggleTopBar: (isMinimal: boolean) => {
      update((n: View) => {
        n = { ...n, isMinimalTopBar: isMinimal };
        return n;
      });
    },
    setCurrentPath: (path: string) => {
      update((n: View) => {
        n = {
          ...n,
          currentPath: path,
          isMenuHidden: checkIfNeedToHideMenu(path, n)
        };
        return n;
      });
    },
    gotoPath: async (path: string, params: any = null) => {
      logger.log({ method: "gotoPath", path });
      appStore.hideFullScreenPlayer();
      update((n: View) => {
        n = {
          ...n,
          currentPath: path,
          isMenuHidden: checkIfNeedToHideMenu(path, n)
        };
        return n;
      });
      // if (!navigator.onLine) {
      //   path = "/offline";
      // }
      if (params) goto(path, params);
      else goto(path);
    }
  };
}

export default view;
