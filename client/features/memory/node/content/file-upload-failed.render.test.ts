import { fireEvent, render, screen } from "@testing-library/svelte";
import { readable, writable } from "svelte/store";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NodeType } from "@nucleum/schema/legacy/node-type.enum";

const FILE_ID = "file_rejectedPhoto01";
const RECORD_ID = "file-record-1";

vi.hoisted(() => {
  window.matchMedia ??= ((query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined
  })) as unknown as typeof window.matchMedia;
});

const uploads = vi.hoisted(() => ({
  failed: new Set<string>(),
  watched: [] as string[],
  retryFileUpload: vi.fn(async () => true)
}));

vi.mock("@nucleum/shared-state/files/file-url", () => ({
  watchFileUploadFailure: (
    fileId: string,
    onChange: (isFailed: boolean) => void
  ) => {
    uploads.watched.push(fileId);
    onChange(uploads.failed.has(fileId));
    return () => undefined;
  },
  retryFileUpload: uploads.retryFileUpload,
  resolveFileUrl: async () => undefined
}));

const photo = {
  id: RECORD_ID,
  fileId: FILE_ID,
  label: "photo.png",
  name: "photo.png",
  type: "image/png",
  size: 11,
  url: "blob:queued-photo"
};

vi.mock("@nucleum/shared-state/files/file.store", () => ({
  fileStore: {
    refresh: async () => ({ ...photo }),
    download: () => undefined
  }
}));

vi.mock("@21n/ui/compositions/files/FileView.svelte", () => ({
  default: () => {}
}));
vi.mock("@nucleum/features/memory/pdfAnnotator/PdfAnnotator.svelte", () => ({
  default: () => {}
}));
vi.mock("@nucleum/features/memory/node/content/WebNodeContent.svelte", () => ({
  default: () => {}
}));
vi.mock("@nucleum/features/memory/audio/AudioContent.svelte", () => ({
  default: () => {}
}));
vi.mock("@nucleum/features/collections/Collection.svelte", () => ({
  default: () => {}
}));
vi.mock("@nucleum/features/focus/tasks/Task.svelte", () => ({
  default: () => {}
}));
vi.mock(
  "@nucleum/features/memory/node/thumbnail/NodeThumbnailTitle.svelte",
  () => ({ default: () => {} })
);
vi.mock(
  "@nucleum/features/memory/node/title/NodeTitleLabelPart.svelte",
  () => ({ default: () => {} })
);
vi.mock(
  "@nucleum/features/collections/properties/CollectionItemThumbnailProperties.svelte",
  () => ({ default: () => {} })
);
vi.mock("@nucleum/shell/navigation/navigation", () => ({
  navigation: { openResource: vi.fn(), openLink: vi.fn() }
}));
vi.mock("@datafn/svelte", () => ({
  toSvelteStore: () => readable({ data: [], loading: false })
}));
vi.mock("@nucleum/datafn/datafn.store", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@nucleum/datafn/datafn.store")>();
  const embedded = {
    id: "node-1",
    label: "photo.png",
    contentType: NodeType.FILE,
    file: { ...photo }
  };
  /** Reads `key` of `target` with its methods bound to it. */
  const read = (target: object, key: string | symbol) => {
    const value = (target as Record<string | symbol, unknown>)[key];
    return typeof value === "function" ? value.bind(target) : value;
  };
  const node = new Proxy(actual.datafn.node, {
    get: (target, key) =>
      key === "query" ? async () => ({ data: [embedded] }) : read(target, key)
  });
  const datafn = new Proxy(actual.datafn, {
    get: (target, key) => (key === "node" ? node : read(target, key))
  });
  return { ...actual, datafn };
});

const { default: MediaContentResolver } =
  await import("@nucleum/features/memory/node/content/MediaContentResolver.svelte");
const { default: NodeThumbnail } =
  await import("@nucleum/features/memory/node/thumbnail/NodeThumbnail.svelte");
const { default: EmbedContent } =
  await import("@nucleum/features/memory/markdown/embed/EmbedContent.svelte");
const { default: DraggableMediaGridElement } =
  await import("@nucleum/features/memory/markdown/mediaGrid/DraggableMediaGridElement.svelte");

const imageNode = {
  id: "node-1",
  label: "photo.png",
  contentType: NodeType.IMAGE,
  file: RECORD_ID
};

const displays: [string, () => unknown][] = [
  [
    "MediaContentResolver",
    () => render(MediaContentResolver, { props: { node: imageNode as never } })
  ],
  [
    "NodeThumbnail",
    () =>
      render(NodeThumbnail, {
        props: { item: imageNode as never, accessPointId: "page-1" as never }
      })
  ],
  [
    "EmbedContent",
    () =>
      render(EmbedContent, {
        props: {
          id: "block-1" as never,
          body: { id: "node:embedded01", subType: NodeType.FILE } as never,
          mdStore: writable({ params: { isReadOnly: true } }) as never
        }
      })
  ],
  [
    "DraggableMediaGridElement",
    () =>
      render(DraggableMediaGridElement, {
        props: {
          item: {
            file: RECORD_ID,
            position: { columns: { columnNo: 0 } }
          } as never,
          id: "media-1",
          handleFileUpload: () => undefined
        }
      })
  ]
];

beforeEach(() => {
  uploads.failed.clear();
  uploads.watched.length = 0;
  uploads.retryFileUpload.mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("file displays of a file whose upload FileFn rejected for good", () => {
  it.each(displays)(
    "%s shows Upload failed with a Retry action that retries the file",
    async (_, show) => {
      uploads.failed.add(FILE_ID);
      show();

      const indicator = await screen.findByTestId("file-upload-failed");
      expect(indicator.textContent).toContain("Upload failed");
      await fireEvent.click(screen.getByRole("button", { name: "Retry" }));
      expect(uploads.retryFileUpload).toHaveBeenCalledWith(FILE_ID);
    }
  );

  it.each(displays)(
    "%s shows no failed state for a file that did not fail",
    async (_, show) => {
      show();

      await vi.waitFor(() => expect(uploads.watched).toContain(FILE_ID));
      expect(screen.queryByTestId("file-upload-failed")).toBeNull();
      expect(screen.queryByText("Upload failed")).toBeNull();
    }
  );
});
