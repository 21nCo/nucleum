<!-- @deprecated - using MultimediaClipperContentScript instead -->
<script lang="ts">
  import { onMount } from "svelte";
  export let colors: string[];
  function isMultimedia(element) {
    return (
      element.tagName === "IMG" ||
      element.tagName === "VIDEO" ||
      element.tagName === "AUDIO"
    );
  }

  export function createClipButton() {
    const button = document.createElement("button");
    button.textContent = "Clip";
    button.classList.add("clip-button-container");
    button.style.borderRadius = "4px";
    return button;
  }
  function positionButtonOverElement(button, element) {
    const rect = element.getBoundingClientRect();
    button.style.position = "fixed";
    button.style.top = `${rect.top - button.offsetHeight}px`;
    button.style.left = `${rect.left}px`;
  }

  function renderClipButton(event) {
    const target = event.target as Element;
    if (isMultimedia(target)) {
      const clipButton = createClipButton();
      positionButtonOverElement(clipButton, target);
      document.body.appendChild(clipButton);
      const onClipClick = (e: MouseEvent) => {
        // placeholder for future save logic
        clipButton.remove();
        e.stopPropagation();
        e.preventDefault();
      };
      clipButton.addEventListener("click", onClipClick);
    }
  }

  function removeAll(event) {
    const existingButtonContainer = document.querySelector(
      ".clip-button-container"
    );
    if (existingButtonContainer) {
      existingButtonContainer.remove();
    }
  }

  let mouseOverHandler: (event: Event) => void;
  let mouseLeaveHandler: (event: Event) => void;
  let trackedElements: Element[] = [];

  onMount(() => {
    mouseOverHandler = (event: Event) => renderClipButton(event);
    mouseLeaveHandler = (event: Event) => removeAll(event);
    trackedElements = Array.from(document.querySelectorAll("img, audio"));
    trackedElements.forEach((element) => {
      element.addEventListener("mouseover", mouseOverHandler);
      element.addEventListener("mouseleave", mouseLeaveHandler);
    });
  });
</script>

<svelte:window on:scroll={removeAll} on:mouseup={removeAll} />

<script lang="ts">
  import { onDestroy } from "svelte";
  onDestroy(() => {
    trackedElements.forEach((element) => {
      element.removeEventListener("mouseover", mouseOverHandler);
      element.removeEventListener("mouseleave", mouseLeaveHandler);
    });
    trackedElements = [];
  });
</script>
