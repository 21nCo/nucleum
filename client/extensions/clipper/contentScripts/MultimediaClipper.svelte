<!-- @deprecated - using MultimediaClipperContentScript instead -->
<script lang="ts">
  import { onMount } from "svelte";
  import { ClipperPersistence } from "$lib/client/extensions/clipper/clipper.persistence";
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
      clipButton.addEventListener("click", function (e) {
        new ClipperPersistence().saveMultimedia(target, "");
        clipButton.remove();
        e.stopPropagation();
        e.preventDefault();
      });
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

  onMount(() => {
    document.querySelectorAll("img, audio").forEach((element) => {
      element.addEventListener("mouseover", function (event) {
        renderClipButton(event);
      });
      element.addEventListener("mouseleave", function (event) {
        removeAll(event);
      });
    });
  });
</script>

<svelte:window on:scroll={removeAll} on:mouseup={removeAll} />
