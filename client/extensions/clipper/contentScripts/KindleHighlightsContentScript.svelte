<script lang="ts">
  import { onMount } from "svelte";
  import {
    contentType,
    kindleSyncState,
    type AmazonAccount,
    type AmazonAccountRegion,
    type Book,
    type BookNode,
    type Highlight,
    type HighlightNode,
    type NextPageState,
    type SavedBookNode
  } from "./KindleHighlights.types";
  import fletcher16 from "fletcher";
  import { ClipperPersistence } from "../clipper.persistence";
  import KindleSyncStatus from "../toolbar/KindleSyncStatus.svelte";
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

  const clipperDB = new ClipperPersistence();
  let syncState: kindleSyncState;
  function scrapBooks(): BookNode[] {
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

      return {
        body: {
          id: bookEl.getAttribute("id"),
          title,
          author: scrapedAuthor.split(": ")[1],
          url: `https://www.amazon.com/dp/${bookEl.getAttribute("id")}`,
          imageUrl: bookEl.querySelector(".kp-notebook-cover-image")
            ? bookEl
                .querySelector(".kp-notebook-cover-image")
                .getAttribute("src")
            : "",
          lastAnnotatedDate: scrapedLastAnnotatedDate
        },
        contentType: contentType.BookNode
      };
    });
  }
  export const mapTextToColor = (
    highlightClasses: string
  ): Highlight["color"] => {
    const matches = /kp-notebook-highlight-(.*)/.exec(highlightClasses);
    return matches ? (matches[1] as Highlight["color"]) : null;
  };

  const highlightsUrl = (book: Book, state?: NextPageState): string => {
    return `${region.notebookUrl}?asin=${book.id}&contentLimitState=${
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

  const hash = (value: string): string => {
    return fletcher16(Buffer.from(value.toLowerCase())).toString();
  };
  const parseHighlights = (
    doc: Document,
    bookNodeId: string
  ): HighlightNode[] => {
    const highlightsEl = doc.querySelectorAll(".a-row.a-spacing-base");
    return Array.from(highlightsEl).map((highlightEl): HighlightNode => {
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

      return {
        body: {
          id: hash(text),
          text,
          color,
          location,
          page: pageMatch ? pageMatch[0] : null,
          note
        },
        contentType: contentType.HighlightNode,
        parent: bookNodeId
      };
    });
  };

  const loadAndScrapeHighlights = async (book: SavedBookNode, url: string) => {
    const response = await fetch(url);
    const bodyText = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(bodyText, "text/html");
    const nextPageState = parseNextPageState(doc);
    return {
      highlights: parseHighlights(doc, book.id),
      nextPageUrl: highlightsUrl(book.body, nextPageState),
      hasNextPage: nextPageState !== null
    };
  };

  const scrapeBookHighlights = async (
    book: SavedBookNode
  ): Promise<HighlightNode[]> => {
    let results: HighlightNode[] = [];

    let url = highlightsUrl(book.body);
    let hasNextPage = true;

    while (hasNextPage) {
      const data = await loadAndScrapeHighlights(book, url);
      results = [...results, ...data.highlights];
      url = data.nextPageUrl;
      hasNextPage = data.hasNextPage;
    }
    return results;
  };
  async function handleSync() {
    try {
      if (syncState == kindleSyncState.Synced) {
        alert("Already Synced");
        return;
      }
      syncState = await clipperDB.updateKindleSyncState(
        kindleSyncState.Syncing
      );
      const books = scrapBooks();
      const savedBooks = await clipperDB.saveAllBooks(books);
      const highlightPromises = savedBooks.map(async (book) => {
        const highlightNode = await scrapeBookHighlights(book);
        return clipperDB.saveHighlightsAndNotes(highlightNode);
      });

      await Promise.all(highlightPromises);
      syncState = await clipperDB.updateKindleSyncState(kindleSyncState.Synced);
    } catch (e) {
      console.error("error while kindle sync", e);
      clipperDB.updateKindleSyncState(kindleSyncState.Sync);
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
    region = matchCurrentUrlWithAmazonRegions();
    syncState = await clipperDB.getKindleSyncState();
    // await clipperDB.deleteAllBooksAndHiglights();
    // syncState = await clipperDB.getKindleSyncState();
  });
</script>

<div class="cs_tidigit_light_blue dark:cs_tidigit_dark_blue relative flex">
  <KindleSyncStatus on:click={handleSync} {syncState} />
</div>
