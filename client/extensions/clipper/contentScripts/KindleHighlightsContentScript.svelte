<script lang="ts">
  import { onMount } from "svelte";
  import {
    type AmazonAccount,
    type AmazonAccountRegion,
    type NextPageState
  } from "./KindleHighlights.types";
  import { syncStore } from "./store";
  import {
    NodeType,
    type IKindleBook,
    type IKindleHighlight,
    type IKindleHighlightBody
  } from "$lib/client/products/memotron/node/node.type";
  import { appEvents } from "$lib/client/stores/notification.store";
  import { logger } from "$lib/client/components/debug/logger.client";
  import { ClipperExtensionEvent } from "$lib/client/products/memotron/common/clip.type";
  import { SyncStatus } from "./types";
  import type { OmitForCaptureWithId } from "$lib/client/components/flux/resourceStores/resource.type";
  import { generateHash } from "$lib/shared/utils/crypto.utils";
  import { generateSyncedResourceId } from "$lib/client/products/memotron/memotron.utils";
  let region: AmazonAccount;
  const amazonRegions: Record<AmazonAccountRegion, AmazonAccount> = {
    global: {
      name: "Global",
      hostname: "amazon.com",
      kindleReaderUrl: "https://read.amazon.com",
      notebookUrl: "https://read.amazon.com/notebook"
    },
    india: {
      name: "India",
      hostname: "amazon.in",
      kindleReaderUrl: "https://read.amazon.in",
      notebookUrl: "https://read.amazon.in/notebook"
    },
    japan: {
      name: "Japan",
      hostname: "amazon.co.jp",
      kindleReaderUrl: "https://read.amazon.co.jp",
      notebookUrl: "https://read.amazon.co.jp/notebook"
    },
    spain: {
      name: "Spain",
      hostname: "amazon.es",
      kindleReaderUrl: "https://leer.amazon.es",
      notebookUrl: "https://leer.amazon.es/notebook"
    },
    germany: {
      name: "Germany/Swiss/Austria",
      hostname: "amazon.de",
      kindleReaderUrl: "https://lesen.amazon.de",
      notebookUrl: "https://lesen.amazon.de/notebook"
    },
    italy: {
      name: "Italy",
      hostname: "amazon.it",
      kindleReaderUrl: "https://leggi.amazon.it",
      notebookUrl: "https://leggi.amazon.it/notebook"
    },
    UK: {
      name: "UK",
      hostname: "amazon.co.uk",
      kindleReaderUrl: "https://read.amazon.co.uk",
      notebookUrl: "https://read.amazon.co.uk/notebook"
    },
    france: {
      name: "France",
      hostname: "amazon.fr",
      kindleReaderUrl: "https://lire.amazon.fr",
      notebookUrl: "https://lire.amazon.fr/notebook"
    }
  };

  function scrapBooks(): OmitForCaptureWithId<IKindleBook>[] {
    const booksEl = document.querySelectorAll(".kp-notebook-library-each-book");

    return Array.from(booksEl).map((bookEl) => {
      const titleElement = bookEl.querySelector("h2.kp-notebook-searchable");
      const title = titleElement ? titleElement.textContent.trim() : "";

      const scrapedLastAnnotatedDateElement = bookEl.querySelector(
        '[id^="kp-notebook-annotated-date"]'
      );
      const scrapedLastAnnotatedDate = scrapedLastAnnotatedDateElement
        ? scrapedLastAnnotatedDateElement.value
        : "";

      const scrapedAuthorElement = bookEl.querySelector(
        "p.kp-notebook-searchable"
      );
      const scrapedAuthor = scrapedAuthorElement
        ? scrapedAuthorElement.textContent
        : "";
      const id = bookEl.getAttribute("id");
      const nodeId = generateSyncedResourceId(id, NodeType.KINDLE_BOOK);
      return {
        url: `https://www.amazon.com/dp/${id}`,
        body: {
          id: id ?? "",
          author: scrapedAuthor?.split(": ")[1] ?? "",
          imageUrl: bookEl?.querySelector(".kp-notebook-cover-image")
            ? bookEl
                ?.querySelector(".kp-notebook-cover-image")
                ?.getAttribute("src")
            : "",
          lastAnnotatedDate: scrapedLastAnnotatedDate
        },
        label: title,
        id: nodeId,
        contentType: NodeType.KINDLE_BOOK
      };
    });
  }
  export const mapTextToColor = (
    highlightClasses: string
  ): IKindleHighlightBody["color"] => {
    const matches = /kp-notebook-highlight-(.*)/.exec(highlightClasses);
    return matches ? (matches[1] as IKindleHighlightBody["color"]) : null;
  };

  const highlightsUrl = (
    kindleBookId: string,
    state?: NextPageState
  ): string => {
    return `${region.notebookUrl}?asin=${kindleBookId}&contentLimitState=${
      state?.contentLimitState ?? ""
    }&token=${state?.token ?? ""}`;
  };

  const parseNextPageState = (doc: Document): NextPageState | null => {
    const contentLimitStateElement = doc.querySelector(
      ".kp-notebook-content-limit-state"
    );
    const tokenElement = doc.querySelector(
      ".kp-notebook-annotations-next-page-start"
    );
    const contentLimitState = contentLimitStateElement
      ? (contentLimitStateElement as HTMLInputElement).value
      : null;
    const token = tokenElement
      ? (tokenElement as HTMLInputElement).value
      : null;
    return token === "" ? null : { contentLimitState, token };
  };

  const parseHighlights = (
    doc: Document,
    bookNodeId: string
  ): OmitForCaptureWithId<IKindleHighlight>[] => {
    const highlightsEl = doc.querySelectorAll(".a-row.a-spacing-base");
    return Array.from(highlightsEl).map(
      (highlightEl): OmitForCaptureWithId<IKindleHighlight> => {
        const pageMatch = /\d+$/.exec(
          highlightEl.querySelector("#annotationNoteHeader")?.textContent || ""
        );

        const highlightClassesElement = highlightEl.querySelector(
          ".kp-notebook-highlight"
        );
        const highlightClasses = highlightClassesElement
          ? highlightClassesElement.className
          : "";
        const color = mapTextToColor(highlightClasses);

        const textElement = highlightEl.querySelector("#highlight");
        const text = textElement ? textElement.textContent?.trim() : "";

        const locationElement = highlightEl.querySelector(
          "#kp-annotation-location"
        );
        const location = locationElement
          ? (locationElement as HTMLInputElement).value
          : "";

        const noteElement = highlightEl.querySelector("#note");
        const note = noteElement
          ? noteElement.innerHTML.replace(/<br\s*\/?>/gi, "\n")
          : "";
        const id = generateHash(text);
        const nodeId = generateSyncedResourceId(id, NodeType.KINDLE_HIGHLIGHT);
        return {
          body: {
            id,
            text,
            color,
            location,
            page: pageMatch ? pageMatch[0] : null,
            note
          },
          label: "",
          id: nodeId,
          contentType: NodeType.KINDLE_HIGHLIGHT,
          parent: bookNodeId
        };
      }
    );
  };

  const loadAndScrapeHighlights = async (
    book: OmitForCaptureWithId<IKindleBook>,
    url: string
  ) => {
    const response = await fetch(url);
    const bodyText = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(bodyText, "text/html");
    const nextPageState = parseNextPageState(doc);
    return {
      highlights: parseHighlights(doc, book.id),
      nextPageUrl: highlightsUrl(book.body.id, nextPageState),
      hasNextPage: nextPageState !== null
    };
  };

  const scrapeBookHighlights = async (
    book: OmitForCaptureWithId<IKindleBook>
  ): Promise<OmitForCaptureWithId<IKindleHighlight>[]> => {
    let results: OmitForCaptureWithId<IKindleHighlight>[] = [];

    let url = highlightsUrl(book.body.id);
    let hasNextPage = true;

    while (hasNextPage) {
      const data = await loadAndScrapeHighlights(book, url);
      results = [...results, ...data.highlights];
      url = data.nextPageUrl;
      hasNextPage = data.hasNextPage;
    }
    return results;
  };
  async function sync() {
    try {
      logger.log({ at: "sync", syncStore: $syncStore });
      if ($syncStore.status == SyncStatus.SYNCING) {
        return;
      }
      syncStore.updateSyncStatus(SyncStatus.SYNCING);
      const books = scrapBooks();
      const bookHighlights = await Promise.all(
        books.map((book) => scrapeBookHighlights(book))
      );
      const savedResponse = await syncStore.save([
        ...books,
        ...bookHighlights.flat()
      ]);
      logger.log({ at: "KindleSyncPage save", savedResponse });
      syncStore.updateSyncStatus(SyncStatus.SYNCED);
    } catch (e) {
      logger.error(e);
      syncStore.updateSyncStatus(SyncStatus.ERRORED);
    }
  }
  function matchCurrentUrlWithAmazonRegions(): AmazonAccount | null {
    const currentUrl = window.location.href;
    for (const regionKey in amazonRegions) {
      const region = amazonRegions[regionKey as AmazonAccountRegion];
      if (currentUrl.startsWith(region.notebookUrl)) {
        return region;
      }
    }
    return null;
  }

  onMount(async () => {
    await syncStore.init(NodeType.KINDLE_BOOK);
    region = matchCurrentUrlWithAmazonRegions();
    appEvents.subscribe(async (x) => {
      logger.debug({ at: "appEvent - Kindle Content Script", event: x.event });
      if (x.event === ClipperExtensionEvent.START_SYNC) {
        sync();
      }
    });
  });
</script>
