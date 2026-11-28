import { describe, it, expect, beforeAll, vi } from "vitest";
import { handleOAuthRedirection } from "./oauth.endpoints";

describe("oauthRedirect", () => {
  it("should handle Apple OAuth redirect", async () => {
    const response = await handleOAuthRedirection(
      {
        state: "guestsix:localredirect.web.memotron.app",
        user: {
          email: "testrun6@bla.ink",
          name: {
            firstName: "testrun first name",
            lastName: "testrun last name"
          }
        }
      },
      "apple",
      "api.memotron.app"
    );
    expect(response).toEqual({
      statusCode: 302,
      headers: {
        Location: expect.stringMatching(
          /^tauri:\/\/localhost\/index\.html(\?token=.*|\/error\?error=.*)$/
        )
      },
      body: ""
    });
  }, 10000);

  it("should handle Google OAuth redirect", async () => {
    const response = await handleOAuthRedirection(
      {
        state: "lypm9lzwmd53tbycw7f7xuow:dev.pointron.app",
        code: "4/0AcvDMrC2Lw0J8c6OSne_SgnbVCi8Xx8MjeVBmN3KGert5S5Q5YxZrYCwT87Gj8sN7VXfRw"
      },
      "google",
      "api.memotron.app"
    );
    expect(response).toEqual({
      statusCode: 302,
      headers: {
        Location: expect.stringMatching(
          /^https:\/\/dev\.pointron\.app\/oauth(\?token=.*|\/error\?error=.*)$/
        )
      },
      body: ""
    });
  }, 10000);
});
