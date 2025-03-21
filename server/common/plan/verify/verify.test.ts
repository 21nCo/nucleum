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
        "fef6bc65bfa24751aa3f476e9b8deaa3ed872b6d8bef7bc9d58544a39dd46bf7";
      //   "e576d89ad257961a5cbdc27f01f352cc329d27f8a5e33215e4389410066eb8d8";

      const result = await verify({ nonce: validNonce }, global.testEnv.agent);
      console.log({ result });
      expect(result).toBeDefined();
    },
    { timeout: 30000 }
  );

  it.only(
    "should verify payment with valid nonce - apple embed",
    async () => {
      // Using the provided nonce for successful case
      const validNonce =
        "6da55bcbcdbc0184c7f222d1625e8026c3cf01bb68da16ae6ce255ba2c9aa4bc";
      //   "e576d89ad257961a5cbdc27f01f352cc329d27f8a5e33215e4389410066eb8d8";

      const result = await verify(
        {
          nonce: validNonce,
          embedTransaction: [
            {
              transactionId: "2000000879945450"
            }
          ]
        },
        global.testEnv.agent
      );
      console.log({ result });
      expect(result).toBeDefined();
    },
    { timeout: 30000 }
  );
});
