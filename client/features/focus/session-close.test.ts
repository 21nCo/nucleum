import "fake-indexeddb/auto";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from "vitest";
let activeSession: typeof import("./session.store").activeSession;
import { SessionState } from "./sessionState.enum";
import { configureCommandHost } from "@nucleum/shared-state/commands/command-host";
import { configureOverlayHost } from "@nucleum/shell/overlays/modal.store";
import { PointronEvent } from "@nucleum/shared-state/events/focus-event.enum";
import { uiState } from "@nucleum/shared-state/preferences/ui-state/uiState.store";
import {
  UIState,
  UIStateScope
} from "@nucleum/shared-state/preferences/ui-state/uiState.type";
import type { IActiveSessionStore } from "./session.type";

const datafnOverrides = vi.hoisted(
  () => ({}) as Record<string | symbol, unknown>
);

vi.mock("@nucleum/datafn/datafn.store", async (original) => {
  const actual =
    await original<typeof import("@nucleum/datafn/datafn.store")>();
  return {
    ...actual,
    datafn: new Proxy(actual.datafn, {
      get: (target, key) =>
        key in datafnOverrides ? datafnOverrides[key] : Reflect.get(target, key)
    })
  };
});

vi.mock("@nucleum/client/runtime/embed/embed.utils", async (original) => ({
  ...(await original<
    typeof import("@nucleum/client/runtime/embed/embed.utils")
  >()),
  postMessageToParent: vi.fn(),
  postDataToParent: vi.fn()
}));

let runAction: ReturnType<typeof vi.fn>;

function configureHosts() {
  runAction = vi.fn();
  configureCommandHost({
    resolveAction: () => null,
    runAction,
    runResourceAction: vi.fn()
  });
  configureOverlayHost({
    onDismiss: vi.fn(),
    openFullscreen: vi.fn(),
    closeFullscreen: vi.fn(),
    resolvePlayer: () => undefined
  });
}

function finishedSnapshot(
  sessionId: string,
  state: SessionState = SessionState.FINISHED
): IActiveSessionStore {
  return {
    ...activeSession.get(),
    currentSessionId: sessionId,
    state,
    isSessionRunning: false
  };
}

function readClosedSessionId() {
  return uiState.getState(UIState.closedFocusSessionId, {
    scope: UIStateScope.DAP
  });
}

beforeAll(async () => {
  configureHosts();
  activeSession = (await import("./session.store")).activeSession;
}, 30_000);

beforeEach(() => {
  configureHosts();
  window.localStorage.removeItem("uiState");
  vi.spyOn(activeSession as any, "persist").mockResolvedValue(undefined);
});

afterEach(() => {
  for (const key of Reflect.ownKeys(datafnOverrides))
    delete datafnOverrides[key];
  activeSession.shallowReset();
  window.localStorage.removeItem("uiState");
  vi.restoreAllMocks();
});

describe("closing a finished focus session", () => {
  it("records the closed session id before the reset snapshot is written", async () => {
    let resolvePersist: () => void = () => {};
    vi.spyOn(activeSession as any, "persist").mockReturnValue(
      new Promise<void>((resolve) => {
        resolvePersist = resolve;
      })
    );
    await activeSession.modify(finishedSnapshot("session-closed"), {
      isPersist: false
    });

    const closing = activeSession.close();

    expect(readClosedSessionId()).toBe("session-closed");
    resolvePersist();
    await closing;
    expect(activeSession.get().state).toBe(SessionState.NOT_STARTED);
  });

  it("does not reopen the finished modal for a closed session snapshot", async () => {
    await activeSession.modify(finishedSnapshot("session-closed"), {
      isPersist: false
    });
    await activeSession.close();
    runAction.mockClear();

    await activeSession.loader(finishedSnapshot("session-closed"));
    await activeSession.loader(
      finishedSnapshot("session-closed", SessionState.PRE_FINISHED)
    );

    expect(runAction).not.toHaveBeenCalledWith(PointronEvent.SESSION_FINISHED);
    expect(activeSession.get().state).toBe(SessionState.NOT_STARTED);
  });

  it("reopens the finished modal for a finished session that was not closed", async () => {
    await activeSession.modify(finishedSnapshot("session-closed"), {
      isPersist: false
    });
    await activeSession.close();
    runAction.mockClear();

    await activeSession.loader(finishedSnapshot("session-open"));

    expect(runAction).toHaveBeenCalledWith(PointronEvent.SESSION_FINISHED);
    expect(activeSession.get().state).toBe(SessionState.FINISHED);
    expect(activeSession.get().currentSessionId).toBe("session-open");
  });

  it("does not record a running session as closed when it is abandoned", async () => {
    await activeSession.modify(
      {
        ...finishedSnapshot("session-running", SessionState.FOCUS_RUNNING),
        isSessionRunning: true
      },
      { isPersist: false }
    );

    await activeSession.close();

    expect(readClosedSessionId()).toBeUndefined();
  });

  it("keeps a pre-finished session reopenable when its log is not saved", async () => {
    const { sessionStore } = await import("./session.store");
    vi.spyOn(sessionStore, "finishFocus").mockRejectedValue(
      new Error("log write failed")
    );
    await activeSession.modify(
      finishedSnapshot("session-unsaved", SessionState.PRE_FINISHED),
      { isPersist: false }
    );

    await activeSession.finishSession({ isClose: true });
    runAction.mockClear();
    await activeSession.loader(
      finishedSnapshot("session-unsaved", SessionState.PRE_FINISHED)
    );

    expect(readClosedSessionId()).toBeUndefined();
    expect(runAction).toHaveBeenCalledWith(PointronEvent.SESSION_FINISHED);
  });

  it("keeps a pre-finished session reopenable when the log mutation reports a failure", async () => {
    datafnOverrides.session = {
      mutate: vi.fn().mockResolvedValue([{ ok: true }])
    };
    datafnOverrides.sessionLog = {
      mutate: vi
        .fn()
        .mockResolvedValue([{ ok: false, error: new Error("insert rejected") }])
    };
    await activeSession.modify(
      finishedSnapshot("session-rejected", SessionState.PRE_FINISHED),
      { isPersist: false }
    );

    await activeSession.finishSession({ isClose: true });
    runAction.mockClear();
    await activeSession.loader(
      finishedSnapshot("session-rejected", SessionState.PRE_FINISHED)
    );

    expect(readClosedSessionId()).toBeUndefined();
    expect(runAction).toHaveBeenCalledWith(PointronEvent.SESSION_FINISHED);
  });
});
