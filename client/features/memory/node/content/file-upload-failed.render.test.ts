import { fireEvent, render, screen } from "@testing-library/svelte";
import { readable, writable } from "svelte/store";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NodeType } from "@nucleum/schema/legacy/node-type.enum";
import { MediaGridType } from "@nucleum/features/memory/node/node.type";
import { Arrangement } from "@21n/ui/elements/direction.enum";

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

/**
 * The `file` records datafn holds, by record ID, each read when queried, so
 * a test can hold a lookup back; and the content type of the embedded node.
 */
const records = vi.hoisted(() => ({
  files: new Map<string, () => Promise<object | undefined>>(),
  embeddedType: ""
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

vi.mock("@21n/ui/compositions/files/FileView.svelte", async () => ({
  default: (
    await import("../../../../../tests/fixtures/components/FileViewStub.svelte")
  ).default
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
  const embedded = () => ({
    id: "node-1",
    label: "photo.png",
    contentType: records.embeddedType || NodeType.FILE,
    file: { ...photo }
  });
  /** Reads `key` of `target` with its methods bound to it. */
  const read = (target: object, key: string | symbol) => {
    const value = (target as Record<string | symbol, unknown>)[key];
    return typeof value === "function" ? value.bind(target) : value;
  };
  const node = new Proxy(actual.datafn.node, {
    get: (target, key) =>
      key === "query" ? async () => ({ data: [embedded()] }) : read(target, key)
  });
  const file = new Proxy(actual.datafn.file, {
    get: (target, key) =>
      key === "query"
        ? async ({ filters }: { filters: { id: string } }) => {
            const found = await records.files.get(filters.id)?.();
            return { data: found ? [found] : [] };
          }
        : read(target, key)
  });
  const datafn = new Proxy(actual.datafn, {
    get: (target, key) =>
      key === "node" ? node : key === "file" ? file : read(target, key)
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
const { default: MediaGrid } =
  await import("@nucleum/features/memory/markdown/mediaGrid/MediaGrid.svelte");
const { navigation } = await import("@nucleum/shell/navigation/navigation");

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
  records.files.clear();
  records.files.set(RECORD_ID, async () => ({ ...photo }));
  records.embeddedType = "";
  vi.mocked(navigation.openResource).mockClear();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

/** Lets every pending promise reaction run. */
async function flushMicrotasks() {
  for (let turn = 0; turn < 20; turn++) await Promise.resolve();
}

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

describe("the file a thumbnail shows the failed state of", () => {
  const PREVIEW_FILE_ID = "file_screenshotPreview01";

  it("is the screenshot it shows, not the node's own file", async () => {
    uploads.failed.add(FILE_ID);
    render(NodeThumbnail, {
      props: {
        item: {
          id: "node-2",
          label: "page",
          contentType: NodeType.WEB_SCREENSHOT,
          file: RECORD_ID,
          body: { file: { ...photo, id: "shot-1", fileId: PREVIEW_FILE_ID } }
        } as never,
        accessPointId: "page-1" as never
      }
    });

    await vi.waitFor(() => expect(uploads.watched).toContain(PREVIEW_FILE_ID));
    expect(uploads.watched).not.toContain(FILE_ID);
    expect(screen.queryByTestId("file-upload-failed")).toBeNull();
  });

  it("is the file cover a grid card shows before its preview", async () => {
    const COVER_FILE_ID = "file_coverImage01";
    records.files.set("cover-record", async () => ({
      ...photo,
      id: "cover-record",
      fileId: COVER_FILE_ID
    }));
    uploads.failed.add(COVER_FILE_ID);
    render(NodeThumbnail, {
      props: {
        item: { ...imageNode, cover: "cover-record" } as never,
        arrangement: Arrangement.GRID,
        accessPointId: "page-1" as never
      }
    });

    const indicator = await screen.findByTestId("file-upload-failed");
    expect(indicator.textContent).toContain("Upload failed");
    expect(uploads.watched).toEqual([COVER_FILE_ID]);
    await fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(uploads.retryFileUpload).toHaveBeenCalledWith(COVER_FILE_ID);
  });

  it.each([Arrangement.GRID, Arrangement.MASONRY])(
    "is no file when a %s card shows a color cover over a failed image",
    async (arrangement) => {
      uploads.failed.add(FILE_ID);
      render(NodeThumbnail, {
        props: {
          item: { ...imageNode, cover: "hex_#336699" } as never,
          arrangement,
          accessPointId: "page-1" as never
        }
      });
      await flushMicrotasks();

      expect(uploads.watched).toEqual([]);
      expect(screen.queryByTestId("file-upload-failed")).toBeNull();
    }
  );

  it("is a list row's image, which it shows before its cover", async () => {
    uploads.failed.add(FILE_ID);
    render(NodeThumbnail, {
      props: {
        item: { ...imageNode, cover: "hex_#336699" } as never,
        arrangement: Arrangement.LIST,
        accessPointId: "page-1" as never
      }
    });

    expect(await screen.findByTestId("file-upload-failed")).toBeTruthy();
    expect(uploads.watched).toContain(FILE_ID);
  });

  it("follows the item it shows and drops a lookup of the previous one", async () => {
    let release = () => {};
    records.files.set(
      "preview-record",
      () =>
        new Promise((resolve) => {
          release = () => resolve({ ...photo, fileId: PREVIEW_FILE_ID });
        })
    );
    uploads.failed.add(PREVIEW_FILE_ID);
    const shown = render(NodeThumbnail, {
      props: {
        item: {
          ...imageNode,
          previewImage: "preview-record"
        } as never,
        accessPointId: "page-1" as never
      }
    });

    await shown.rerender({
      item: { ...imageNode, file: { ...photo } } as never,
      accessPointId: "page-1" as never
    });
    await vi.waitFor(() => expect(uploads.watched).toContain(FILE_ID));
    release();
    await flushMicrotasks();

    expect(uploads.watched).not.toContain(PREVIEW_FILE_ID);
    expect(screen.queryByTestId("file-upload-failed")).toBeNull();
  });
});

describe("a media grid holding a file whose upload failed", () => {
  /** Renders a grid of two items laid out as `type`, returning its files' container. */
  async function showGrid(type: MediaGridType) {
    const shown = render(MediaGrid, {
      props: {
        block: {
          id: "grid-1",
          body: {
            type,
            noOfColumns: 1,
            items: ["media-1", "media-2"].map((id, index) => ({
              id,
              file: RECORD_ID,
              position: { auto: index, columns: { index, columnNo: 0 } }
            }))
          }
        } as never,
        mdStore: {
          ...writable({ params: { isReadOnly: true } }),
          insert: vi.fn(),
          deleteBlock: vi.fn()
        } as never
      }
    });
    const media = await vi.waitFor(() => {
      const found = screen.getAllByTestId("file-view");
      expect(found).toHaveLength(2);
      return found;
    });
    const container = media[0].closest("button")!;
    return { shown, media, container };
  }

  it.each([MediaGridType.AUTO, MediaGridType.COLUMNS])(
    "adds no %s layout child for the failed state, laying it over the item",
    async (type) => {
      // The grid lays its items out on a timer once mounted; run it mounted.
      vi.useFakeTimers({ toFake: ["setTimeout"] });
      const usual = await showGrid(type);
      const usualChildren = usual.container.children.length;
      expect(usual.media.every((m) => m.parentElement === usual.container)).toBe(
        true
      );
      usual.shown.unmount();

      uploads.failed.add(FILE_ID);
      const failed = await showGrid(type);
      const indicators = await vi.waitFor(() => {
        const found = screen.getAllByTestId("file-upload-failed");
        expect(found).toHaveLength(2);
        return found;
      });

      expect(failed.container.children.length).toBe(usualChildren);
      failed.media.forEach((media, index) => {
        const item = media.parentElement!;
        expect(item.parentElement).toBe(failed.container);
        expect(indicators[index].parentElement).toBe(item);
        expect(indicators[index].className).toContain("absolute");
      });
      vi.runOnlyPendingTimers();
    }
  );
});

describe("Retry inside an interactive file display", () => {
  it("retries a media grid's file without inserting a block, by click or key", async () => {
    // The grid lays its items out on a timer once mounted; run it mounted.
    vi.useFakeTimers({ toFake: ["setTimeout"] });
    uploads.failed.add(FILE_ID);
    const mdStore = {
      ...writable({ params: {} }),
      insert: vi.fn(() => "block-2"),
      deleteBlock: vi.fn()
    };
    const onInsert = vi.fn();
    render(MediaGrid, {
      props: {
        block: {
          id: "grid-1",
          body: {
            items: [
              {
                id: "media-1",
                file: RECORD_ID,
                position: { auto: 0, columns: { index: 0, columnNo: 0 } }
              }
            ]
          }
        } as never,
        mdStore: mdStore as never,
        onInsert
      }
    });
    const retry = await vi.waitFor(() =>
      screen.getByRole("button", { name: "Retry" })
    );

    await fireEvent.keyDown(retry, { key: "Enter" });
    await fireEvent.keyUp(retry, { key: "Enter" });
    await fireEvent.keyDown(retry, { key: " " });
    await fireEvent.click(retry);

    expect(uploads.retryFileUpload).toHaveBeenCalledWith(FILE_ID);
    expect(mdStore.insert).not.toHaveBeenCalled();
    expect(onInsert).not.toHaveBeenCalled();

    const grid = screen.getByTestId("file-upload-failed").closest("button");
    await fireEvent.keyDown(grid!, { key: "Enter" });
    expect(mdStore.insert).toHaveBeenCalledTimes(1);
    vi.runOnlyPendingTimers();
  });

  it("retries an embedded image without opening it", async () => {
    records.embeddedType = NodeType.IMAGE;
    uploads.failed.add(FILE_ID);
    render(EmbedContent, {
      props: {
        id: "block-1" as never,
        body: { id: "node:embedded01", subType: NodeType.IMAGE } as never,
        mdStore: writable({ params: { isReadOnly: true } }) as never
      }
    });
    const retry = await screen.findByRole("button", { name: "Retry" });

    await fireEvent.keyDown(retry, { key: "Enter" });
    await fireEvent.click(retry);

    expect(uploads.retryFileUpload).toHaveBeenCalledWith(FILE_ID);
    expect(navigation.openResource).not.toHaveBeenCalled();

    const preview = screen.getByTestId("file-upload-failed").closest("button");
    await fireEvent.click(preview!);
    expect(navigation.openResource).toHaveBeenCalledTimes(1);
  });
});
