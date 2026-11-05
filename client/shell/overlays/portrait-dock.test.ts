import { afterEach, describe, expect, it } from "vitest";
import { get } from "svelte/store";
import { player } from "./modal.store";
import {
  isPlayerShownInPage,
  isPortraitMiniPlayerDocked
} from "./portrait-dock";

afterEach(() => {
  player.reset();
  isPlayerShownInPage.set(false);
});

describe("portrait dock", () => {
  it("docks the mini player while it is on", () => {
    expect(get(isPortraitMiniPlayerDocked)).toBe(false);
    player.showMini("focus-player");
    expect(get(isPortraitMiniPlayerDocked)).toBe(true);
  });

  it("hides the docked mini player while a page shows the session", () => {
    player.showMini("focus-player");
    isPlayerShownInPage.set(true);
    expect(get(isPortraitMiniPlayerDocked)).toBe(false);
  });
});
