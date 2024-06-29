<script lang="ts">
  import { highlight } from "~contents/highlightV4";
  import InlineTextToolbar from "$lib/client/extensions/clipper/InlineTextToolbar.svelte";
  import { elementFromQuery, getQuery } from "~contents/getQuery";
  import { ClipperPersistence } from "$lib/client/extensions/clipper/clipper.persistence";
  import { onMount } from "svelte";
  import {
    ClipperExtensionEvent,
    type Clip,
    type TextHighlightContent
  } from "$lib/client/types/memotron/clip.type";
  import { NodeType } from "$lib/client/types/memotron/node.type";
  import {
    ExtensionEvent,
    type TabData
  } from "$lib/client/types/extension.type";
  import { extractFullTabData } from "$lib/client/utils/extension.utils";
  export let colors: string[];
  let isShowInlineToolbar: boolean = false;
  let popoverPosition: { top: number; left: number } = { top: 0, left: 0 };
  let activeColor: string | null = null;
  export let page: any;
  let selectedClip: { color: string; id: string } | null = null;
  let selectedClipId: string = "";
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
          color:
            selection.focusNode?.dataset?.highlightColor ??
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
        if (activeColor) {
          await highlightSelectedText(selection, activeColor);
          selectedClip = {
            color: activeColor ?? "",
            id: selectedClipId
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

  async function saveSelectedText(selectedText, container, selection, color) {
    const anchorOffset = selection.anchorOffset;
    const focusOffset = selection.focusOffset;
    try {
      let tabData;
      const nodeData = await chrome.storage.local.get("node");
      if (!nodeData?.node?.id) {
        tabData = extractFullTabData();
      }
      return new ClipperPersistence().saveClip(
        {
          contentType: NodeType.TEXT_CLIP,
          body: {
            text: selectedText,
            color
          },
          metadata: {
            container: getQuery(container),
            anchorNode: getQuery(selection.anchorNode),
            anchorOffset: anchorOffset,
            focusNode: getQuery(selection.focusNode),
            focusOffset: focusOffset
          }
        },
        tabData
      );
    } catch (e) {
      console.error("ERROR", e);
    }
  }

  async function highlightSelectedText(selection, color) {
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
      color
    );
    if (!page && result.parent) page = { id: result.parent };
    selectedClipId = result.id;
    highlight(
      selectedText,
      container,
      selection,
      color,
      textColor,
      result.id,
      highlightClickCallback
    );
    chrome.runtime.sendMessage({ event: ClipperExtensionEvent.CLIPS_CHANGED });
    //selection.removeAllRanges();

    // Save the selected text and current URL to the database.
    // chrome.tabs.query({ active: true, lastFocusedWindow: true }, tabs => {
    //     let link = tabs[0].url;
    // });
  }
  export async function refreshPageClips(clips: Clip<TextHighlightContent>[]) {
    for (const record of clips) {
      const selection = {
        anchorNode: elementFromQuery(record.metadata.anchorNode),
        anchorOffset: record.metadata.anchorOffset,
        focusNode: elementFromQuery(record.metadata.focusNode),
        focusOffset: record.metadata.focusOffset
      };
      const container = elementFromQuery(record.metadata.container);

      let textColor = "white";

      if (selection.anchorNode && selection.focusNode && container) {
        highlight(
          record.body.text,
          container,
          selection,
          record.body.color,
          textColor,
          record.id,
          highlightClickCallback
        );
      }
    }
    return false;
  }

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("Content script - message received: ", {
      message,
      sender
    });
    if (message.event === ExtensionEvent.CLICK_SIDEBAR) {
      if (message.clip.id) scrollToHighlight(message.clip.id);
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

  export function onActivateColor(e: CustomEvent<string | number>) {
    console.log("onActivateColor", e.detail);
    if (e.detail === 0) {
      activeColor = null;
    } else if (typeof e.detail === "string") {
      activeColor = e.detail;
    }
  }
  async function onInlineColorSelection(e: CustomEvent<string>) {
    console.log("onInlineColorSelection", e.detail);
    const color = e.detail;
    const selection = window.getSelection();
    if (selection?.toString().length > 0) {
      console.log("Selected text: ", selection.toString());
      await highlightSelectedText(selection, color);
      selectedClip = {
        color,
        id: selectedClipId
      };
    }
  }
  function highlightClickCallback(e: any) {
    console.log("highlightClickCallback", e);
    selectedClip = {
      id: e.id,
      color: e.color
    };
    selectedClipId = e.id;
    handleTextSelection();
  }
  onMount(() => {
    window.addEventListener(
      "message",
      function (event) {
        if (event.source != window) return;
        if (event.data.type && event.data.type == "signin") {
          console.log("Token data is: " + event.data.token);
          localStorage.setItem("stoken", event.data.token.token);
          chrome.storage.sync.set(
            { token: event.data.token.token },
            function () {
              console.log("Token is stored to be used later.");
            }
          );
        }
      },
      false
    );
  });

  function onmouseup(e: MouseEvent) {
    // console.log("onmouseup", e);
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
      {colors}
      selectedColor={selectedClip?.color ?? ""}
      isExistingClip={selectedClip !== null}
    />
  </div>
{/if}

<svelte:window on:scroll={onscroll} on:mouseup={onmouseup} />
