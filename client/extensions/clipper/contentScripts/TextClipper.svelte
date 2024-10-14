<script lang="ts">
  import { highlight } from "$lib/client/extensions/clipper/contentScripts/highlightV4";
  import InlineTextToolbar from "$lib/client/extensions/clipper/InlineTextToolbar.svelte";
  import {
    elementFromQuery,
    getQuery
  } from "$lib/client/extensions/clipper/contentScripts/getQuery";
  import { onMount } from "svelte";
  import { ClipperExtensionEvent } from "$lib/client/products/memotron/common/clip.type";
  import {
    NodeType,
    type IClipCapture,
    type ITextClip
  } from "$lib/client/products/memotron/node/node.type";
  import { ExtensionEvent } from "$lib/client/types/extension.type";
  import { webpage } from "./store";
  import { appEvents } from "$lib/client/stores/notification.store";
  import { AlertType } from "$lib/client/types/notification.type";
  import type { IHighlighter } from "$lib/client/products/memotron/common/highlighters/highlight.type";
  import { logger } from "$lib/client/components/debug/logger.client";
  import { highlightStore } from "$lib/client/products/memotron/common/highlighters/highlight.store";
  import { relayToSidePanel } from "$lib/client/utils/extension.utils";
  let isShowInlineToolbar: boolean = false;
  let popoverPosition: { top: number; left: number } = { top: 0, left: 0 };
  let activeHighlighter: IHighlighter | null = null;
  // export let page: any;
  let selectedClip: { highlighterId: string; id: string } | null = null;
  let selectedClipId: string = "";
  let inlineToolbarFeedback: { message: string; type: AlertType } | string = "";
  onMount(() => {
    const sub = appEvents.subscribe((x) => {
      if (x.event === ClipperExtensionEvent.REFRESH_CLIPS_RENDERING) {
        logger.log({ at: "onMessage - text clipper", event: x.event });
        refreshPageClips();
      }
    });
    return () => {
      sub();
    };
  });
  async function handleTextSelection() {
    const selection = window.getSelection();
    let rect: DOMRect;
    if (selection.focusNode && selection.anchorNode) {
      const focusNodeHasClass =
        selection.focusNode?.classList?.contains("memotron-clipped");
      const anchorNodeHasClass =
        selection.anchorNode?.classList?.contains("memotron-clipped");
      if (focusNodeHasClass && anchorNodeHasClass) {
        selectedClip = {
          highlighterId:
            selection.focusNode?.dataset?.highlighterId ??
            selection.focusNode?.style?.backgroundColor ??
            "",
          id: selection.focusNode?.dataset?.highlightId ?? ""
        };
        setTimeout(() => {
          let highlightId = selectedClip.id;
          let focusElement = document.querySelector(
            `.memotron-clipped[data-highlight-id="${highlightId}"]`
          );
          if (focusElement) {
            rect = focusElement.getBoundingClientRect();
          }
          if (rect) {
            popoverPosition = {
              top: rect.top - 50,
              left: rect.left - 50
            };
            isShowInlineToolbar = true;
          }
        }, 100);
      } else {
        selectedClip = null;
      }
    }
    if (selection.focusNode && !selectedClip) {
      const range = document.createRange();
      range.setStart(selection.focusNode, selection.focusOffset);
      range.setEnd(selection.focusNode, selection.focusOffset);
      rect = range.getBoundingClientRect();
      const isUpwards = selection.anchorOffset > selection.focusOffset;
      popoverPosition = {
        top: rect.top + (isUpwards ? -50 : 30),
        left: rect.left + (isUpwards ? -50 : -50)
      };
      if (selection?.toString().length > 0) {
        if (activeHighlighter) {
          await highlightSelectedText(selection, activeHighlighter);
          selectedClip = {
            id: selectedClipId,
            highlighterId: activeHighlighter.id ?? ""
          };
        }
        isShowInlineToolbar = true;
      } else {
        isShowInlineToolbar = false;
      }
    } else if (!selection.focusNode) {
      isShowInlineToolbar = false;
    }
  }

  async function saveSelectedText(
    selectedText,
    container,
    selection,
    highlighterId: string
  ) {
    const anchorOffset = selection.anchorOffset;
    const focusOffset = selection.focusOffset;
    try {
      const data: IClipCapture = {
        contentType: NodeType.TEXT_CLIP,
        body: {
          text: selectedText,
          highlighterId
        },
        metadata: {
          container: getQuery(container),
          anchorNode: getQuery(selection.anchorNode),
          anchorOffset: anchorOffset,
          focusNode: getQuery(selection.focusNode),
          focusOffset: focusOffset
        }
      };
      return webpage.saveClip(data);
    } catch (e) {
      console.error("ERROR", e);
    }
  }

  async function highlightSelectedText(selection, highlighter: IHighlighter) {
    let selectedText = selection.toString();
    if (selectedText.length <= 0 || selectedText.trim().length === 0) return;
    let container = selection.getRangeAt(0).commonAncestorContainer;
    while (!container.innerHTML) {
      container = container.parentNode;
    }
    let textColor = "white";
    const result = await saveSelectedText(
      selectedText,
      container,
      selection,
      highlighter.id
    );
    if (!result?.id) {
      inlineToolbarFeedback = {
        message: "Clip not saved! Please try again.",
        type: AlertType.ERROR
      };
      return;
    }
    inlineToolbarFeedback = { message: "Clip saved!", type: AlertType.SUCCESS };
    selectedClipId = result.id;
    highlight(
      selectedText,
      container,
      selection,
      highlighter,
      textColor,
      result.id,
      highlightClickCallback
    );
    relayToSidePanel({
      event: ClipperExtensionEvent.CLIPS_CHANGED,
      data: $webpage.clips
    });
    //selection.removeAllRanges();

    // Save the selected text and current URL to the database.
    // chrome.tabs.query({ active: true, lastFocusedWindow: true }, tabs => {
    //     let link = tabs[0].url;
    // });
  }
  export async function refreshPageClips() {
    const clips: ITextClip[] = $webpage.clips?.filter(
      (clip) => clip.contentType === NodeType.TEXT_CLIP
    ) as ITextClip[];
    logger.log({ at: "refreshPageClips", clips });
    for (const record of clips) {
      const selection = {
        anchorNode: elementFromQuery(record.metadata?.anchorNode),
        anchorOffset: record.metadata?.anchorOffset,
        focusNode: elementFromQuery(record.metadata?.focusNode),
        focusOffset: record.metadata?.focusOffset
      };
      const container = elementFromQuery(record.metadata?.container);

      let textColor = "white";
      const highlighter = $highlightStore.highlighters.find(
        (x) => x.id === record.body.highlighterId
      );
      if (selection.anchorNode && selection.focusNode && container) {
        highlight(
          record.body.text,
          container,
          selection,
          highlighter,
          textColor,
          record.id,
          highlightClickCallback
        );
      }
    }
    return false;
  }

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    logger.log({
      at: "onMessage - Text clipper",
      message,
      sender
    });
    if (message.event === ExtensionEvent.CLICK_FROM_SIDEPANEL) {
      if (message.data?.clip?.id) scrollToHighlight(message.data.clip.id);
    } else if (
      message.event === ClipperExtensionEvent.RESOLVE_TEXT_HIGHLIGHTS_ORDER
    ) {
      const elements = document.querySelectorAll("span.memotron-clipped");
      const data = Array.from(elements).map((element, index) => {
        return {
          id: element.getAttribute("data-highlight-id"),
          order: index
        };
      });
      const clipsOrder = data.filter(
        (v, i, a) => a.findIndex((t) => t.id === v.id) === i
      );
      sendResponse(clipsOrder);
    }
  });
  function scrollToHighlight(clipId: string) {
    const element = document.querySelector(`[data-highlight-id="${clipId}"]`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  export function onActivateColor(e: CustomEvent<IHighlighter | number>) {
    logger.log({ at: "onActivateColor", e });
    if (e.detail === 0) {
      activeHighlighter = null;
    } else if (typeof e.detail !== "number") {
      activeHighlighter = e.detail;
    }
  }
  async function onInlineColorSelection(e: CustomEvent<IHighlighter>) {
    console.log("onInlineColorSelection", e.detail);
    const highlighter = e.detail;
    const selection = window.getSelection();
    if (selection?.toString().length > 0) {
      console.log("Selected text: ", selection.toString());
      inlineToolbarFeedback = "saving...";
      await highlightSelectedText(selection, highlighter);
      selectedClip = {
        highlighterId: highlighter.id,
        id: selectedClipId
      };
    }
  }
  function highlightClickCallback(e: any) {
    console.log("highlightClickCallback", e);
    selectedClip = {
      id: e.id,
      highlighterId: e.highlighterId
    };
    selectedClipId = e.id;
    handleTextSelection();
  }

  function onmouseup(e: MouseEvent) {
    //console.log("onmouseup", e);
    if (
      e.target instanceof HTMLElement &&
      e.target.nodeName === "PLASMO-CSUI"
    ) {
      return;
    }
    handleTextSelection();
  }
  function onscroll(e: Event) {
    // console.log("onscroll", e);
    handleTextSelection();
  }
  function onclick(e: MouseEvent) {
    console.log("onclick", e);
    handleTextSelection();
  }
</script>

{#if isShowInlineToolbar}
  <div
    style="position:fixed; top:{popoverPosition.top}px; left:{popoverPosition.left}px"
  >
    <InlineTextToolbar
      on:color={onInlineColorSelection}
      bind:feedback={inlineToolbarFeedback}
      selectedHighlighterId={selectedClip?.highlighterId ?? ""}
      id={selectedClip?.id}
    />
  </div>
{/if}

<svelte:window on:scroll={onscroll} on:mouseup={onmouseup} />
