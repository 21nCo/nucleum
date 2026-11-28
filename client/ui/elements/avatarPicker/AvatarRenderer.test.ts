import { render } from "@testing-library/svelte";
import { afterEach, describe, expect, it } from "vitest";

import AvatarRenderer from "./AvatarRenderer.svelte";
import { avatarEmojiText, avatarIconText } from "./avatar-code";
import { AvatarType } from "./avatar.type";

const markup = '<img src="x" onerror="window.__avatarProbe=1">';

afterEach(() => {
  document.body.replaceChildren();
});

describe("AvatarRenderer with a stored avatar code", () => {
  it("renders an emoji code that contains markup as text", () => {
    const { container } = render(AvatarRenderer, {
      props: { avatar: { type: AvatarType.EMOJI, code: markup } }
    });
    expect(container.querySelector("img")).toBeNull();
    expect(container.textContent?.trim()).toBe(markup);
  });

  it("renders nothing for an icon code that is not a ligature or character reference", () => {
    const { container } = render(AvatarRenderer, {
      props: { avatar: { type: AvatarType.ICON, isFilled: true, code: markup } }
    });
    expect(container.querySelector("img")).toBeNull();
    expect(container.textContent?.trim()).toBe("");
  });

  it("still renders the character references the picker stores", () => {
    const emoji = render(AvatarRenderer, {
      props: { avatar: { type: AvatarType.EMOJI, code: "&#X2764&#XFE0F&#X200D&#X1F525" } }
    });
    expect(emoji.container.textContent?.trim()).toBe("\u2764\uFE0F\u200D\u{1F525}");
    const icon = render(AvatarRenderer, {
      props: { avatar: { type: AvatarType.ICON, isFilled: true, code: "&#XE88E" } }
    });
    expect(icon.container.textContent?.trim()).toBe("\uE88E");
  });
});

describe("avatar code text", () => {
  it("accepts icon ligature names and character references only", () => {
    expect(avatarIconText("zoom_out_map")).toBe("zoom_out_map");
    expect(avatarIconText("&#XE88E;")).toBe("\uE88E");
    expect(avatarIconText("&#59534")).toBe("\uE88E");
    expect(avatarIconText("Info")).toBe("");
    expect(avatarIconText("&#XE88E<b>")).toBe("");
    expect(avatarIconText(undefined)).toBe("");
  });

  it("drops references to invalid code points", () => {
    expect(avatarEmojiText("&#XD800;z&#X110000;")).toBe("z");
    expect(avatarEmojiText("&#0")).toBe("");
    expect(avatarEmojiText(42)).toBe("");
  });
});
