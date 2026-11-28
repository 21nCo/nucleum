import { describe, expect, it } from "vitest";

import { frameNonSensitiveUserInfo } from "../../server/common/account/account.utils";
import { stringify } from "../../shared/utils/json.utils";

const base = {
  id: "user:abc",
  emailParts: { characterCount: 11, emailDomain: "example.com", firstFew: "abc", lastFew: "xyz" },
  nickName: "Test",
  joinDate: "2026-01-01T00:00:00.000Z"
};

describe("frameNonSensitiveUserInfo", () => {
  it("leaves out optional fields that are not set, so no $NONE reaches the client", () => {
    const framed = frameNonSensitiveUserInfo(base as any);
    expect(framed).toStrictEqual(base);
    expect(stringify(framed)).not.toContain("$NONE");
  });

  it("leaves out unset email parts too", () => {
    const { emailParts, ...rest } = base;
    expect(frameNonSensitiveUserInfo(rest as any)).toStrictEqual(rest);
  });

  it("returns region, bootstrap state and picture once they are set", () => {
    expect(
      frameNonSensitiveUserInfo({
        ...base,
        profilePictureUrl: "https://example.com/p.png",
        region: "useast",
        isBootstrapped: true,
        pass: "hash"
      } as any)
    ).toEqual({
      ...base,
      profilePictureUrl: "https://example.com/p.png",
      region: "useast",
      isBootstrapped: true
    });
  });
});
