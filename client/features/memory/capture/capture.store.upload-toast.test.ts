import { afterEach, describe, expect, it, vi } from "vitest";

const upload = vi.hoisted(() => ({
  uploadFileV2: vi.fn(async () => {
    throw new Error("upload failed");
  })
}));

vi.mock("@nucleum/shared-state/files/file-upload", () => ({
  fileUpload: upload
}));
vi.mock("@nucleum/shell/navigation/navigation", () => ({
  navigation: { closeResource: vi.fn(), openResource: vi.fn() }
}));
vi.mock("@nucleum/shared-state/notifications/notification.store", () => ({
  toasts: { success: vi.fn(), error: vi.fn() },
  inlineToasts: { success: vi.fn() }
}));

import { NodeType } from "@nucleum/schema/legacy/node-type.enum";
import { ActiveCaptureStore } from "./capture.store";

const image = () =>
  new File(["image bytes"], "photo.jpg", { type: "image/jpeg" });

afterEach(() => {
  upload.uploadFileV2.mockClear();
});

describe("capture saves that show their own upload error", () => {
  const capture = ActiveCaptureStore.resolve("capture:upload-toast" as never);

  it.each([
    {
      save: "saveFile",
      run: () =>
        capture.saveFile(image(), NodeType.IMAGE, {
          isErrorToastSuppressed: true
        })
    },
    {
      save: "saveMultipleFiles",
      run: () =>
        capture.saveMultipleFiles(
          [
            { file: image(), contentType: NodeType.IMAGE },
            { file: image(), contentType: NodeType.IMAGE }
          ],
          { isEmbedContext: true, isErrorToastSuppressed: true }
        )
    },
    {
      save: "saveCameraCapture",
      run: () =>
        capture.saveCameraCapture(new Blob(["jpeg"]), {
          isErrorToastSuppressed: true
        })
    }
  ])("$save passes the toast suppression to the upload", async ({ run }) => {
    await expect(run()).rejects.toThrow("upload failed");
    expect(upload.uploadFileV2).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.any(Blob),
      expect.objectContaining({ isErrorToastSuppressed: true })
    );
  });

  it("keeps the upload toast when the caller does not ask to suppress it", async () => {
    await expect(capture.saveFile(image(), NodeType.IMAGE)).rejects.toThrow(
      "upload failed"
    );
    expect(upload.uploadFileV2).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.any(Blob),
      expect.objectContaining({ isErrorToastSuppressed: undefined })
    );
  });
});
