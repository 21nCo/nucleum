import { cleanup, fireEvent, render, waitFor } from "@testing-library/svelte";
import { writable } from "svelte/store";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NodeType } from "@nucleum/schema/legacy/node-type.enum";
import account from "@nucleum/client/runtime/account/account.store";
import context from "@nucleum/client/runtime/context.store";
import { Context } from "@nucleum/shared-state/app-context/app-store.type";
import { confirmationNotification } from "@nucleum/shared-state/notifications/notification.store";
import { ActiveCaptureStore } from "./capture.store";
import {
  UserDataMode,
  UserSessionType
} from "@nucleum/client/runtime/account/account.type";

/**
 * A signed-in cloud user who is offline captures files into the account's
 * upload queue (uploadFileV2 keeps them on the device), so no entry point
 * turns the file away with an offline error before the save.
 */
const offlineMessage =
  "You seem to be offline. File upload is not yet available in offline mode.";

vi.hoisted(() => {
  Element.prototype.animate = (() => ({
    cancel: () => undefined,
    finished: Promise.resolve()
  })) as never;
});

const upload = vi.hoisted(() => ({
  uploadFileV2: vi.fn(async () => [{ id: "file:offline", contentType: "" }])
}));
vi.mock("@nucleum/shared-state/files/file-upload", () => ({
  fileUpload: { uploadFileV2: upload.uploadFileV2 },
  isUploadFailureShown: () => false
}));
vi.mock("@nucleum/shell/navigation/navigation", () => ({
  navigation: { closeResource: vi.fn(), openResource: vi.fn() }
}));

/** The drop handlers of the drop zones rendered so far, newest last. */
const drops = vi.hoisted(() => ({
  zones: [] as {
    isPreventClickToBrowse?: boolean;
    onDrop: (all: File[], valid: File[], errors: unknown[]) => unknown;
  }[]
}));
vi.mock("@21n/ui/actions/fileDrop.action", () => ({
  fileDrop: (_node: HTMLElement, options: (typeof drops.zones)[number]) => {
    drops.zones.push(options);
    return { update: () => undefined, destroy: () => undefined };
  }
}));

/** The pasted content the paste confirmation resolves. */
const paste = vi.hoisted(() => ({ data: undefined as unknown }));
vi.mock(
  "@nucleum/features/memory/capture/capture.utils",
  async (importOriginal) => ({
    ...(await importOriginal<object>()),
    resolvePasteContents: async () => paste.data
  })
);

vi.stubGlobal(
  "matchMedia",
  vi.fn(() => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn()
  }))
);

const { default: FileUploader } = await import("./FileUploader.svelte");
const { default: PasteConfirmationModal } =
  await import("./PasteConfirmationModal.svelte");
const { default: PreviewImageUploader } =
  await import("@nucleum/features/memory/node/PreviewImageUploader.svelte");
const { default: Block } =
  await import("@nucleum/features/memory/markdown/Block.svelte");

const image = (name = "photo.jpg") =>
  new File(["image bytes"], name, { type: "image/jpeg" });

/**
 * Enables the preview uploader's Save button, whose disabled state does not
 * follow a dropped file (a non-reactive `let` that predates this change).
 */
const enabled = (button: HTMLElement) => {
  (button as HTMLButtonElement).disabled = false;
  return button;
};

beforeEach(() => {
  account.set({
    dataMode: UserDataMode.CLOUD,
    sessionType: UserSessionType.RETURNING
  });
  context.update((ctx) => ({ ...ctx, isInOfflineMode: true }));
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  upload.uploadFileV2.mockClear();
  drops.zones.length = 0;
  paste.data = undefined;
  context.update((ctx) => ({ ...ctx, isInOfflineMode: false }));
});

describe("an offline cloud user's capture reaches the save", () => {
  it("from Capture > Upload", async () => {
    const saveFile = vi
      .spyOn(ActiveCaptureStore.prototype, "saveFile")
      .mockResolvedValue({ id: "file:offline" } as never);
    const { queryByText } = render(FileUploader, {
      captureStore: ActiveCaptureStore.resolve("capture:offline-upload")
    });

    await drops.zones.at(-1)?.onDrop([image()], [image()], []);

    expect(saveFile).toHaveBeenCalledTimes(1);
    expect(saveFile.mock.calls[0][0]).toBeInstanceOf(File);
    expect(queryByText(offlineMessage)).toBeNull();
  });

  it("from a file dropped on a markdown block", async () => {
    const notify = vi.spyOn(confirmationNotification, "notify");
    const saveFile = vi
      .spyOn(ActiveCaptureStore.prototype, "saveFile")
      .mockResolvedValue({
        id: "file:offline",
        contentType: NodeType.IMAGE
      } as never);
    const block = {
      id: "node:offline-block",
      contentType: NodeType.SIMPLE_TEXT,
      body: { text: "" }
    };
    const mdStore = Object.assign(writable({ blocks: [block], params: {} }), {
      alter: writable(undefined),
      insert: vi.fn()
    });
    render(Block, {
      props: { block, mdStore, index: 0 } as never,
      context: new Map<string, unknown>([
        [Context.NODE, { id: "node:offline-parent" }],
        [Context.MARKDOWN, vi.fn()],
        [Context.CONTENT, { publish: vi.fn() }]
      ])
    });
    const blockDrop = drops.zones.find((zone) => zone.isPreventClickToBrowse);

    await blockDrop?.onDrop([image()], [image()], []);

    expect(saveFile).toHaveBeenCalledTimes(1);
    expect(notify).not.toHaveBeenCalledWith(
      expect.objectContaining({ message: offlineMessage })
    );
  });

  it("from a node's preview image", async () => {
    const { getByRole, queryByText } = render(PreviewImageUploader, {
      nodeId: "node:preview" as never
    });
    await drops.zones.at(-1)?.onDrop([image()], [image()], []);
    await fireEvent.click(enabled(getByRole("button", { name: "Save" })));

    await waitFor(() => expect(upload.uploadFileV2).toHaveBeenCalledTimes(1));
    expect(queryByText(offlineMessage)).toBeNull();
  });

  it("from pasted files", async () => {
    const saveMultipleFiles = vi
      .spyOn(ActiveCaptureStore.prototype, "saveMultipleFiles")
      .mockResolvedValue([]);
    paste.data = {
      contentType: NodeType.IMAGE,
      multipleFiles: {
        files: [
          { file: image("one.jpg"), contentType: NodeType.IMAGE },
          { file: image("two.jpg"), contentType: NodeType.IMAGE }
        ],
        totalCount: 2,
        sizeExceededCount: 0
      }
    };
    const { findByRole, queryByText } = render(PasteConfirmationModal, {
      event: new Event("paste") as ClipboardEvent
    });

    await fireEvent.click(
      await findByRole("button", { name: /Save 2 as nodes/ })
    );

    expect(saveMultipleFiles).toHaveBeenCalledTimes(1);
    expect(queryByText(offlineMessage)).toBeNull();
  });
});
