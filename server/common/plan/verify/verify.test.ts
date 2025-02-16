import { describe, it, expect } from "vitest";
import { verify } from "./index";
import { ValidationError, NotFoundError } from "../../errors";

describe("verify", () => {
  it("should throw error when no nonce is provided", async () => {
    await expect(verify({} as any, global.testEnv.agent)).rejects.toThrow(
      ValidationError
    );
    await expect(verify({} as any, global.testEnv.agent)).rejects.toThrow(
      "Nonce is required"
    );
  });

  it("should throw error when transaction is not found", async () => {
    const invalidNonce = "invalid-nonce";
    await expect(
      verify({ nonce: invalidNonce }, global.testEnv.agent)
    ).rejects.toThrow(NotFoundError);
    await expect(
      verify({ nonce: invalidNonce }, global.testEnv.agent)
    ).rejects.toThrow("Transaction not found");
  });

  it(
    "should verify payment with valid nonce",
    async () => {
      // Using the provided nonce for successful case
      const validNonce =
        "0be718ac3446fe7abdf528124c5ae9b69969392042d7e0110bb03dbfc794f3df";
      //   "e576d89ad257961a5cbdc27f01f352cc329d27f8a5e33215e4389410066eb8d8";

      const result = await verify({ nonce: validNonce }, global.testEnv.agent);
      console.log({ result });
      expect(result).toBeDefined();
    },
    { timeout: 30000 }
  );
});
