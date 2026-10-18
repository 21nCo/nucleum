import { afterEach, expect, it, vi } from "vitest";
import context from "@nucleum/client/runtime/context.store";
import { installApplicationHosts } from "../configure-hosts";

vi.mock("@nucleum/composition/ComponentResolver.svelte", () => ({
  default: () => {}
}));
vi.mock("@nucleum/composition/AppLoadingView.svelte", () => ({
  default: () => {}
}));
vi.mock("@nucleum/composition/SubAtomLogo.svelte", () => ({
  default: () => {}
}));
vi.mock("@nucleum/surfaces/library/records/Records.svelte", () => ({
  default: () => {}
}));
vi.mock("@nucleum/surfaces/commands/action-runner", () => ({
  actionRunner: { runAction() {}, resolveAction() {}, runResourceAction() {} }
}));
vi.mock("@21n/ui/compositions/files/FileView.svelte", () => ({
  default: () => {}
}));

afterEach(() => vi.restoreAllMocks());

it("shares the platform subscription until the last root unmounts and supports remount", () => {
  const unsubscribe = vi.fn();
  const subscribe = vi.spyOn(context, "subscribe").mockReturnValue(unsubscribe);
  const releaseBase = installApplicationHosts();
  const releaseUser = installApplicationHosts();
  try {
    expect(subscribe).toHaveBeenCalledTimes(1);
    releaseBase();
    releaseBase();
    expect(unsubscribe).not.toHaveBeenCalled();
    releaseUser();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
    const releaseRemount = installApplicationHosts();
    try {
      expect(subscribe).toHaveBeenCalledTimes(2);
    } finally {
      releaseRemount();
    }
    expect(unsubscribe).toHaveBeenCalledTimes(2);
  } finally {
    releaseBase();
    releaseUser();
  }
});
