import { get } from "svelte/store";
import { windowObject } from "../stores/app.store";

export function renderPopover(parentRef: HTMLElement, popRef: HTMLElement) {
  const triggerRect = parentRef.getBoundingClientRect();
  let popRect = popRef.getBoundingClientRect();
  let documentWidth = get(windowObject).documentWidth;
  const rawDocumentWidth = window.innerWidth;
  // console.log({ triggerRect, documentWidth, rawDocumentWidth, popRect });
  if (documentWidth === 0) {
    documentWidth = rawDocumentWidth;
  }
  popRef.style.position = "fixed";
  if (documentWidth - triggerRect.right < 300) {
    // console.log("1", {
    //   left: triggerRect.left,
    //   measure: documentWidth - triggerRect.right,
    // });
    // popRef.style.right = `${triggerRect.left}px`;
    // //popRef.style.left = "auto";
    popRef.style.top = `${triggerRect.bottom + 5}px`;
    popRef.style.right = `${documentWidth - triggerRect.right}px`;
  } else if (triggerRect.left < 300) {
    popRef.style.left = `${triggerRect.right}px`;
    popRef.style.right = "auto";
  } else {
    popRef.style.left = `${triggerRect.right + 2}px`;
    popRef.style.right = "auto";
  }
  popRef.style.display = popRef.style.display === "none" ? "block" : "none";
  // popRect = popRef.getBoundingClientRect();
  // console.log({ popRef, popRect });
}
