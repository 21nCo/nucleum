<script lang="ts">
  import { createEventDispatcher, onMount } from "svelte";
  import * as pdfjs from "pdfjs-dist";
  // import pdfjsWorker from "pdfjs-dist/build/pdf.worker.min.js?url";
  // import * as pdfjsWorker from "pdfjs-dist/legacy/build/pdf.worker.min.mjs";
  // import downloadsvg from "./images/toolbarDownload.svg?url";
  // import printsvg from "./images/toolbarPrint.svg?url";
  // import zoominsvg from "./images/toolbarZoomIn.svg?url";
  // import zoomoutsvg from "./images/toolbarZoomOut.svg?url";
  // import spreadsvg from "./images/toolbarPageView.svg?url";
  // import gapsvg from "./images/toolbarPageGap.svg?url";
  import "./pdfviewer.css";
  import context from "$lib/client/stores/context.store";
  import { postToParent } from "$lib/client/utils/embed.utils";
  import { generateSimpleRandomId } from "$lib/shared/utils/crypto.utils";

  // pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker;
  // pdfjs.GlobalWorkerOptions.workerSrc =
  //   "../../../../node_modules/pdfjs-dist/build/pdf.worker.mjs";
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.mjs",
    import.meta.url
  ).toString();
  const eventDispatcher = createEventDispatcher();
  //variables for Annotation
  export let pdfViewer: any;
  export let pdfDocument: any;
  export let url: string | URL; //url of pdf.
  const INTERNAL_URL = url.toString();
  let currentPGNumber: Number = 1;
  let embed_message_id = generateSimpleRandomId();
  let dataViaEmbed: any;
  // let classname = ""; //allows component to recieve classes
  // export { classname as class };

  let styles = ""; //allows component to recieve classes
  export { styles as style };

  export let scale = 1;
  const MIN_SCALE = 0.5;
  const MAX_SCALE = 2.3;

  enum SpreadModes { //init display modes.
    "NONE",
    "ODD",
    "EVEN"
  }
  export let display_mode = "";
  let _spread_mode = SpreadModes.NONE;
  if (display_mode in SpreadModes) {
    _spread_mode = SpreadModes[display_mode as "NONE" | "ODD" | "EVEN"];
  }

  //internal variables.
  let component_container: HTMLDivElement;
  let container: HTMLDivElement;
  let password = "";
  let password_error = false;
  let load_error_messge: string | null = null;
  let _prev_gap_top = "8px";
  let _prev_gap_bottom = "8px";

  //Init button handlers (some require hydration on mount)
  let onPasswordSubmit: () => void;
  let onZoomIn: () => void;
  let onZoomOut: () => void;
  let onPageDisplay: () => void;

  const printPdf = (url: string) => {
    const iframe = document.createElement("iframe");
    document.body.appendChild(iframe);

    iframe.style.display = "none";
    iframe.onload = function () {
      setTimeout(function () {
        iframe.focus();
        iframe.contentWindow?.print();
      }, 1);
    };

    iframe.src = url;
  };

  const onPageGap = () => {
    const pages = component_container.getElementsByClassName("page");
    if (pages.length === 0) {
      return;
    }
    const current_styles = getComputedStyle(pages[0] as HTMLDivElement);
    const current_gap_bottom = current_styles.marginBottom;
    const current_gap_top = current_styles.marginTop;
    for (const page of pages) {
      (page as HTMLDivElement).style.marginBottom = _prev_gap_bottom;
      (page as HTMLDivElement).style.marginTop = _prev_gap_top;
    }
    _prev_gap_bottom = current_gap_bottom;
    _prev_gap_top = current_gap_top;
  };
  onMount(async () => {
    const render = renderDocument("onMount");
    onPasswordSubmit = () => {
      renderDocument("onPasswordSubmit");
    };

    if ($context.isEmbed) {
      postToParent({
        fetch: JSON.stringify({ url: url.toString(), id: embed_message_id })
      });
    }
    window.addEventListener("message", handleMessageFromParent);

    return () => {
      render.then((pdf_viewer) => {
        pdf_viewer.cleanup();
      });
    };
  });

  const renderDocument = async (from: string) => {
    // const init_promise = import("pdfjs-dist/web/pdf_viewer.js").then(
    const init_promise = import("pdfjs-dist/web/pdf_viewer.mjs").then(
      (pdfjs_viewer) => {
        const event_bus = new pdfjs_viewer.EventBus();

        // (Optionally) enable hyperlinks within PDF files.
        const pdf_link_service = new pdfjs_viewer.PDFLinkService({
          eventBus: event_bus
        });

        // (Optionally) enable find controller.
        const pdf_find_controller = new pdfjs_viewer.PDFFindController({
          eventBus: event_bus,
          linkService: pdf_link_service
        });
        const pdf_viewer = new pdfjs_viewer.PDFViewer({
          container,
          eventBus: event_bus,
          linkService: pdf_link_service,
          findController: pdf_find_controller,
          l10n: pdfjs_viewer.NullL10n
        });
        pdf_link_service.setViewer(pdf_viewer);

        return { pdf_viewer, pdf_link_service };
      }
    );

    const { pdf_viewer, pdf_link_service } = await init_promise;
    // Loading document.
    let pdfData: Uint8Array;
    try {
      if ($context.isEmbed) {
        if (!dataViaEmbed) return;
        pdfData = base64ToUint8Array(dataViaEmbed);
      } else {
        const arrayBuffer = await fetch(url.toString()).then((response) =>
          response.arrayBuffer()
        );
        pdfData = new Uint8Array(arrayBuffer);
      }
    } catch (error) {
      console.error("Error loading PDF:", error);
      load_error_messge = "Error loading PDF. Please try again.";
      return;
    }
    console.log({ pdfData: pdfData?.length });
    if (!pdfData) return;
    const loading_task = pdfjs.getDocument({
      data: pdfData,
      password,
      isEvalSupported: false
    });
    loading_task.promise
      .then((pdf_document) => {
        pdf_viewer.setDocument(pdf_document);
        pdf_link_service.setDocument(pdf_document, null);
        pdf_viewer.currentScale = scale;
        pdf_viewer.spreadMode = _spread_mode;
        pdfDocument = pdf_document;
        pdfViewer.eventBus.on("pagechanging", (eventt: any) => {
          currentPGNumber = eventt.pageNumber;
        });
      })
      .catch(function (error) {
        password_error = true;
        load_error_messge = error.message;
      });

    onZoomIn = () => {
      if (scale <= MAX_SCALE) {
        scale = scale + 0.1;
        pdf_viewer.currentScale = scale;
        eventDispatcher("zoomIn");
      }
    };
    onZoomOut = () => {
      if (scale >= MIN_SCALE) {
        scale = scale - 0.1;
        pdf_viewer.currentScale = scale;
        eventDispatcher("zoomOut");
      }
    };
    onPageDisplay = () => {
      _spread_mode = (_spread_mode + 1) % 3;
      pdf_viewer.spreadMode = _spread_mode;
    };
    pdfViewer = pdf_viewer;
    return pdf_viewer;
  };

  function handleMessageFromParent(event: any) {
    if (event?.data?.type === "SWIFT_MESSAGE" && event?.data?.payload) {
      const parsed = JSON.parse(event.data.payload);
      if (parsed?.id && parsed?.id === embed_message_id) {
        if (parsed?.data) {
          dataViaEmbed = parsed.data;
          renderDocument("onMessageFromParent");
        }
      }
    }
  }

  function base64ToUint8Array(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    return bytes;
  }

  function download(url: string) {
    const a = document.createElement("a");
    if (!a.click) {
      throw new Error('DownloadManager: "a.click()" is not supported.');
    }
    a.href = url;
    a.target = "_parent";
    // Use a.download if available. This increases the likelihood that
    // the file is downloaded instead of opened by another PDF plugin.
    if ("download" in a) {
      a.download = url.substring(url.lastIndexOf("/") + 1);
    }
    // <a> must be in the document for recent Firefox versions,
    // otherwise .click() is ignored.
    (document.body || document.documentElement).append(a);
    a.click();
    a.remove();
  }
</script>

<!-- <div class="flex w-8/10"> -->

<div
  class="relative w-full h-full"
  style={styles}
  bind:this={component_container}
>
  <div id="viewer-parent" class="w-full h-full">
    {#if load_error_messge}
      <div class="spdfinner">
        {#if password_error}
          <p>This document requires a password to open:</p>
          <div>
            <input type="password" bind:value={password} />
            <button on:click={onPasswordSubmit} class="password-button">
              Submit
            </button>
          </div>
        {/if}
        <p>{load_error_messge}</p>
      </div>
    {:else}<!-- svelte-ignore a11y-click-events-have-key-events -->
      <!-- <div class="spdfbanner">
        <span class="toolbarbutton" on:click={onZoomIn}>
          <img
            title="Zoom In"
            src={zoominsvg}
            alt="zoom in"
            class="spdfbutton"
          />
        </span>
        <span class="toolbarbutton" on:click={onZoomOut}>
          <img
            title="Zoom Out"
            src={zoomoutsvg}
            alt="zoom out"
            class="spdfbutton"
          />
        </span>
        <span class="toolbarbutton" on:click={onPageGap}>
          <img
            title="Toggle Page Display"
            src={gapsvg}
            alt="toggle page gap"
            class="spdfbutton"
          />
        </span>
        <span class="toolbarbutton" style="color:white">{currentPGNumber}</span>
        <span class="toolbarbutton" on:click={onPageDisplay}>
          <img
            title="Toggle Page Display"
            src={spreadsvg}
            alt="toggle page display"
            class="spdfbutton"
          />
        </span>
        <span class="toolbarbutton" on:click={() => printPdf(INTERNAL_URL)}>
          <img title="Print" src={printsvg} alt="print" class="spdfbutton" />
        </span>
        <span class="toolbarbutton" on:click={() => download(INTERNAL_URL)}>
          <img
            title="Download"
            src={downloadsvg}
            alt="download"
            class="spdfbutton"
          />
        </span>
      </div> -->
      <!-- <div class="spdfinner"> -->
      <div id="viewerContainer" bind:this={container}>
        <div id="viewer" class="pdfViewer" />
        <!-- <slot /> -->
        <slot />
      </div>
      <!-- </div> -->
    {/if}
  </div>
</div>

<!-- </div> -->

<!-- <style>
  .spdfbanner {
    position: absolute;
    z-index: 10;
    top: 0px;
    height: 2.75rem;
    width: 100%;
    display: flex;
    justify-content: center;
    gap: 0.5rem;
    align-items: center;
    background-color: rgb(41 37 36);
    box-shadow: 1rem;
  }
  .spdfbutton {
    width: 25px;
  }
  .spdfinner {
    position: absolute;
    top: 0px;
    bottom: 0px;
    width: 100%;
  }
  .toolbarbutton:hover {
    background-color: rgb(87 83 78);
  }
  .toolbarbutton {
    border-radius: 2px;
    padding: 4px;
  }
</style> -->
