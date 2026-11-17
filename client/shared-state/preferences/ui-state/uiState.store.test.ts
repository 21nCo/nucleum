import { beforeEach, describe, expect, it, vi } from "vitest";

const { merge } = vi.hoisted(() => ({ merge: vi.fn() }));

vi.mock("@nucleum/datafn/datafn.store", () => ({
  datafn: {
    currentNamespace: () => "user:test",
    kv: {
      merge,
      set: vi.fn(async () => ({ ok: true })),
      signal: () => ({
        subscribe: (handler: (value: unknown) => void) => {
          handler(undefined);
          return () => {};
        },
        get: () => undefined,
        dispose: () => {}
      })
    }
  }
}));

import { uiState } from "./uiState.store";

describe("uiState writes", () => {
  beforeEach(() => {
    merge.mockReset();
    merge.mockResolvedValue({ ok: true });
  });

  it("saves changes made in the same tick as one merge", async () => {
    const first = uiState.modify({ a: 1 } as any);
    const second = uiState.modify({ b: 2 } as any);
    await Promise.all([first, second]);
    expect(merge).toHaveBeenCalledTimes(1);
    expect(merge.mock.calls[0][1]).toEqual({ a: 1, b: 2 });
  });

  it("starts a new merge for changes in a later tick", async () => {
    await uiState.modify({ a: 1 } as any);
    await uiState.modify({ b: 2 } as any);
    expect(merge).toHaveBeenCalledTimes(2);
  });
});
