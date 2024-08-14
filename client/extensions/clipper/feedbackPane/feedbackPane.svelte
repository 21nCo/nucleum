<script lang="ts">
  import Button from "$lib/client/elements/button/Button.svelte";
  import HoverableElement from "$lib/client/elements/HoverableElement.svelte";
  import FormControlLabel from "$lib/client/elements/text/formLabel/FormControlLabel.svelte";
  import LinkBoxOnClipper from "$lib/client/products/memotron/common/linkbox/LinkBoxOnClipper.svelte";
  import { Position } from "$lib/client/types/direction.enum";
  import { cn } from "$lib/client/utils/ui.utils";
  import { createEventDispatcher, onMount } from "svelte";
  import { toolbarState, webpage } from "../contentScripts/store";
  import LinkItems from "$lib/client/products/memotron/common/linkbox/LinkItems.svelte";
  import InlineFeedbackText from "../InlineFeedbackText.svelte";
  import { AlertType } from "$lib/client/types/notification.type";
  import InlineMarkdownTextInput from "$lib/client/components/markdown/content/InlineMarkdownTextInput.svelte";
  import type { IImageElement } from "../contentScripts/types";
  export let isShown: boolean = false;
  export let feedback: string = "";
  export let image: IImageElement | null = null;
  export let nodeId: string = "";

  const dispatch = createEventDispatcher();
  let content = image ? "image" : "webpage";
  let notes: string = "";
  let autoCloseDuration = 30;
  let closeTimer: any;
  let closeActionTimestamp: number;
  let isHovering = false;
  let now = Date.now();
  async function onNotesChange(e: CustomEvent) {
    feedback = "Saving...";
    console.log("saving notes", nodeId, notes, image);
    if (image && nodeId) {
      const response = await webpage.persistClipNotes(nodeId, notes);
    } else $webpage.notes = notes;
    //TODO - TEMP - show feedback from result - getting result from debounded function
    setTimeout(() => {
      feedback = "Notes saved!";
    }, 1000);
  }
  function onHover() {
    restartCloseTimer();
  }
  onMount(() => {
    restartCloseTimer();
    return () => {
      clearTimeout(closeTimer);
    };
  });
  function closePane() {
    isShown = false;
    dispatch("resetInputs");
  }
  function restartCloseTimer() {
    clearTimeout(closeTimer);
    if (isHovering) {
      return;
    }
    closeActionTimestamp = Date.now();
    closeTimer = setTimeout(() => {
      closePane();
    }, autoCloseDuration * 1000);
  }
  async function onLink(e) {
    feedback = "Linking...";
    let result;
    if (e.detail) {
      if (image) result = await webpage.linkClip(nodeId, e.detail);
      else result = await webpage.linkPage(e.detail);
    }
    feedback = result?.message
      ? result
      : { message: "Linking failed", type: AlertType.ERROR };
  }
  async function onUnlink(e) {
    feedback = "Removing link...";
    let result;
    if (e.detail) {
      if (image) result = await webpage.removeLinkForClip(nodeId, e.detail);
      else result = await webpage.removeLinkForPage(e.detail);
    }
    feedback = result?.message
      ? result
      : { message: "Unlinking failed", type: AlertType.ERROR };
  }
  setInterval(() => {
    now = Date.now();
  }, 1000);
  $: countdown =
    autoCloseDuration - 1 - Math.floor((now - closeActionTimestamp) / 1000);
  function onLinkClick(e: CustomEvent) {
    console.log("link click", e.detail);
  }
</script>

<HoverableElement
  bind:isHovering
  on:hover={onHover}
  class={cn(
    "fixed w-80 flex flex-col gap-4 p-4 bg-bgs1 shadow-md rounded-md border border-brs2",
    {
      "right-16 top-1/2 transform -translate-y-1/2 space-y-1.5":
        $toolbarState.position === Position.Right,
      "bottom-0 right-0 m-6": $toolbarState.position === Position.Bottom
    }
  )}
>
  <div class="flex flex-col gap-2">
    <div class="flex w-full justify-between items-center">
      <!-- <span class="text-fgs3 text-b2"> Link this page </span> -->
      <FormControlLabel
        props={{
          label: `Link this ${content}`,
          tooltip: {
            body: `Link this ${content} to a node or add it to a collection by searching and clicking`
          }
        }}
      />
      <span class="h-6 w-6 flex justify-center items-center">
        {#if isHovering}
          <Button icon="cross-circled" on:click={closePane} />
        {:else if isShown}
          <!-- TODO closing animation circle -->
          <span
            class="border border-fgs2 rounded-full text-b4 text-fgs2 px-1 h-4 flex justify-center items-center"
          >
            {countdown}
          </span>
        {/if}
      </span>
    </div>
    <LinkBoxOnClipper on:link={onLink} />
    <LinkItems
      links={$webpage.links}
      on:click={onLinkClick}
      on:unlink={onUnlink}
    />
  </div>
  <div class="flex w-full justify-center bg-bgs2 rounded-md px-2 py-1">
    <!-- Fix placeholder color issue -->
    <InlineMarkdownTextInput
      placeholder="Add notes"
      bind:content={notes}
      on:change={onNotesChange}
      on:input={onNotesChange}
    />
  </div>
  {#if image != null}
    <img src={image.src} alt={image.alt} class="w-full" />
  {/if}
  <InlineFeedbackText bind:feedback />
</HoverableElement>
