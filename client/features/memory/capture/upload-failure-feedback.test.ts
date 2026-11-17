import { cleanup, fireEvent, render, waitFor } from "@testing-library/svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NodeType } from "@nucleum/schema/legacy/node-type.enum";
import account from "@nucleum/client/runtime/account/account.store";
import {
  UserDataMode,
  UserSessionType
} from "@nucleum/client/runtime/account/account.type";

/** The upload's failure toasts, shown unless the caller suppresses them. */
const upload = vi.hoisted(() => {
  const shownFailures: string[] = [];
  return {
    shownFailures,
    uploadFileV2: vi.fn(
      async (
        _contentType: string,
        fileName: string,
        _blob: Blob,
        params?: { isErrorToastSuppressed?: boolean }
      ) => {
        if (!params?.isErrorToastSuppressed) shownFailures.push(fileName);
        throw new Error("upload failed");
      }
    )
  };
});

vi.mock("@nucleum/shared-state/files/file-upload", () => ({
  fileUpload: { uploadFileV2: upload.uploadFileV2 },
  isUploadFailureShown: () => false
}));
vi.mock("@nucleum/shell/navigation/navigation", () => ({
  navigation: { closeResource: vi.fn(), openResource: vi.fn() }
}));

/** The preview uploader's drop handler, captured from its drop zone. */
const drop = vi.hoisted(() => ({
  onDrop: undefined as
    undefined | ((all: File[], valid: File[], errors: unknown[]) => void)
}));
vi.mock("@21n/ui/actions/fileDrop.action", () => ({
  fileDrop: (_node: HTMLElement, options: { onDrop: typeof drop.onDrop }) => {
    drop.onDrop = options.onDrop;
    return { update: () => undefined, destroy: () => undefined };
  }
}));

vi.stubGlobal(
  "matchMedia",
  vi.fn(() => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn()
  }))
);

const { default: ShareContentSaver } =
  await import("./ShareContentSaver.svelte");
const { default: PreviewImageUploader } =
  await import("@nucleum/features/memory/node/PreviewImageUploader.svelte");

const image = (name = "photo.jpg") =>
  new File(["image bytes"], name, { type: "image/jpeg" });

afterEach(() => {
  cleanup();
  upload.shownFailures.length = 0;
  upload.uploadFileV2.mockClear();
  drop.onDrop = undefined;
});

describe("a failed upload is shown once to the user", () => {
  it("in a shared single file save", async () => {
    render(ShareContentSaver, {
      data: { file: image() },
      nodeType: NodeType.IMAGE
    });

    await waitFor(() => expect(upload.uploadFileV2).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(upload.shownFailures).toEqual(["photo.jpg"]));
  });

  it("in a shared multiple file save", async () => {
    const { getByRole } = render(ShareContentSaver, {
      data: {
        multipleFiles: {
          files: [
            { file: image("one.jpg"), contentType: NodeType.IMAGE },
            { file: image("two.jpg"), contentType: NodeType.IMAGE }
          ],
          totalCount: 2,
          sizeExceededCount: 0
        }
      },
      nodeType: NodeType.IMAGE,
      saveAsNodeFilesCount: 2
    });

    await fireEvent.click(getByRole("button", { name: /Save 2 as nodes/ }));

    await waitFor(() => expect(upload.uploadFileV2).toHaveBeenCalled());
    await waitFor(() => expect(upload.shownFailures).toEqual(["one.jpg"]));
  });

  it("in a preview image save", async () => {
    account.set({
      dataMode: UserDataMode.LOCAL,
      sessionType: UserSessionType.RETURNING
    });
    const { getByRole } = render(PreviewImageUploader, {
      nodeId: "node:preview" as never
    });
    drop.onDrop?.([image()], [image()], []);
    // The button's disabled state does not follow the dropped file (a
    // non-reactive `let` that predates this change), so enable it here.
    const save = getByRole("button", { name: "Save" }) as HTMLButtonElement;
    save.disabled = false;

    await fireEvent.click(save);

    await waitFor(() => expect(upload.uploadFileV2).toHaveBeenCalledTimes(1));
    expect(upload.shownFailures).toEqual(["photo.jpg"]);
  });
});
