import { convertToRGBA } from "$lib/client/utils/ui.utils";
import $ from "jquery";

1;

export const HIGHLIGHT_CLASS = "memotron-clipped";
export const DELETED_CLASS = "memotron--deleted";
export function highlight(
  selString,
  container,
  selection,
  highlighter,
  textColor,
  id,
  callback
) {
  const highlightInfo = {
    highlighter,
    textColor: textColor ? textColor : "inherit",
    id,
    selectionString: selString,
    anchor: $(selection.anchorNode),
    anchorOffset: selection.anchorOffset,
    focus: $(selection.focusNode),
    focusOffset: selection.focusOffset
  };
  try {
    recursiveWrapper($(container), highlightInfo);
  } catch (e) {
    console.log("error highlighting", e);
    return false;
  }

  if (selection.removeAllRanges) selection.removeAllRanges();

  const parent = $(container).parent();
  parent.find(`.${HIGHLIGHT_CLASS}`).each((_i, el) => {
    initializeHighlightEventListeners(el, callback);
  });

  return true;
}

export function initializeHighlightEventListeners(el, callback) {
  el.style.cursor = "pointer";
  Array.from(el.getElementsByTagName("span")).forEach((span) => {
    span.style.cursor = "pointer";
  });
  el.onclick = function () {
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(el);
    selection.removeAllRanges();
    selection.addRange(range);
    const id = this.getAttribute("data-highlight-id");
    const highlighterId = this.getAttribute("data-highlighter-id");
    if (callback) callback({ id, highlighterId });
  };
}

function recursiveWrapper(container, highlightInfo) {
  return _recursiveWrapper(container, highlightInfo, false, 0);
}

function _recursiveWrapper(
  container,
  highlightInfo,
  startFound,
  charsHighlighted
) {
  const {
    anchor,
    focus,
    anchorOffset,
    focusOffset,
    highlighter,
    textColor,
    id,
    selectionString
  } = highlightInfo;
  const selectionLength = selectionString.length;

  container.contents().each((_index, element) => {
    if (charsHighlighted >= selectionLength) return; // Stop early if we are done highlighting

    if (element.nodeType !== Node.TEXT_NODE) {
      const jqElement = $(element);
      if (
        jqElement.is(":visible") &&
        getComputedStyle(element).visibility !== "hidden"
      ) {
        [startFound, charsHighlighted] = _recursiveWrapper(
          jqElement,
          highlightInfo,
          startFound,
          charsHighlighted
        );
      }
      return;
    }
    // The first element to appear could be the anchor OR the focus node,
    // since you can highlight from left to right or right to left
    let startIndex = 0;
    if (!startFound) {
      if (!anchor.is(element) && !focus.is(element)) return;

      startFound = true;
      startIndex = Math.min(
        ...[
          ...(anchor.is(element) ? [anchorOffset] : []),
          ...(focus.is(element) ? [focusOffset] : [])
        ]
      );
    }

    // If we get here, we are in a text node, the start was found and we are not done highlighting
    const { nodeValue, parentElement: parent } = element;

    if (startIndex > nodeValue.length) {
      // Start index is beyond the length of the text node, can't find the highlight
      // NOTE: we allow the start index to be equal to the length of the text node here just in case
      throw new Error(
        `No match found for highlight string '${selectionString}'`
      );
    }

    // Split the text content into three parts, the part before the highlight, the highlight and the part after the highlight:
    const highlightTextEl = element.splitText(startIndex);

    // Instead of simply blindly highlighting the text by counting characters,
    // we check if the text is the same as the selection string.
    let i = startIndex;
    for (; i < nodeValue.length; i++) {
      // Skip any whitespace characters in the selection string as there can
      // be more than in the text node:
      while (
        charsHighlighted < selectionLength &&
        selectionString[charsHighlighted].match(/\s/u)
      )
        charsHighlighted++;

      if (charsHighlighted >= selectionLength) break;

      const char = nodeValue[i];
      if (char === selectionString[charsHighlighted]) {
        charsHighlighted++;
      } else if (!char.match(/\s/u)) {
        // FIXME: Here, this is where the issue happens
        // Similarly, if the char in the text node is a whitespace, ignore any differences
        // Otherwise, we can't find the highlight text; throw an error
        throw new Error(
          `No match found for highlight string '${selectionString}'`
        );
      }
    }

    // If textElement is wrapped in a .memotron--clipper span, do not add this highlight
    // as it is already highlighted, but still count the number of charsHighlighted
    if (parent.classList.contains(HIGHLIGHT_CLASS)) return;

    const elementCharCount = i - startIndex; // Number of chars to highlight in this particular element
    const insertBeforeElement = highlightTextEl.splitText(elementCharCount);
    const highlightText = highlightTextEl.nodeValue;

    // If the text is all whitespace, ignore it
    if (highlightText.match(/^\s*$/u)) {
      parent.normalize(); // Undo any 'splitText' operations
      return;
    }

    // If we get here, highlight!
    // Wrap the highlighted text in a span with the highlight class name
    const highlightNode = document.createElement("span");
    highlightNode.classList.add(
      highlighter.id === "inherit" ? DELETED_CLASS : HIGHLIGHT_CLASS
    );
    const rgbaColor = convertToRGBA(highlighter.color, 0.5);
    highlightNode.style.backgroundColor = rgbaColor;
    highlightNode.style.color = "inherit";
    highlightNode.dataset.highlightId = id;
    highlightNode.dataset.highlightColor = highlighter.color;
    highlightNode.dataset.highlighterId = highlighter.id;
    highlightNode.textContent = highlightTextEl.nodeValue;
    highlightTextEl.remove();
    parent.insertBefore(highlightNode, insertBeforeElement);
  });

  return [startFound, charsHighlighted];
}

export function removeHighlight(id) {
  const highlightSpans = document.querySelectorAll(
    `[data-highlight-id="${id}"]`
  );
  highlightSpans.forEach((highlight) => {
    highlight.style.backgroundColor = "transparent";
    highlight.style.color = "inherit";
    highlight.classList.remove(HIGHLIGHT_CLASS);
    highlight.dataset.highlightId = "";
    highlight.dataset.highlightColor = "";
    highlight.dataset.highlighterId = "";
  });
}

export function removeAllHighlights() {
  const existingHighlights = document.querySelectorAll("[data-highlight-id]");
  existingHighlights.forEach((highlight) => {
    try {
      const id = highlight.dataset.highlightId;
      removeHighlight(id);
    } catch (e) {}
  });
}

export function removeHighlights(ids) {
  try {
    ids.forEach((id) => {
      removeHighlight(id);
    });
  } catch (e) {
    console.error({ at: "removeHighlights", ids, e });
  }
}

export function changeColor(id, highlighter) {
  try {
    const highlightSpans = document.querySelectorAll(
      `[data-highlight-id="${id}"]`
    );
    highlightSpans.forEach((highlight) => {
      const rgbaColor = convertToRGBA(highlighter.color, 0.5);
      highlight.style.backgroundColor = rgbaColor;
      highlight.dataset.highlightColor = highlighter.color;
      highlight.dataset.highlighterId = highlighter.id;
    });
  } catch (e) {
    console.error({ at: "changeColor", e });
  }
}
