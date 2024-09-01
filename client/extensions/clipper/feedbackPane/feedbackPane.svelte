<script lang="ts">
  import Button from "$lib/client/elements/button/Button.svelte";
  import HoverableElement from "$lib/client/elements/HoverableElement.svelte";
  import FormControlLabel from "$lib/client/elements/text/formLabel/FormControlLabel.svelte";
  import LinkBoxOnClipper from "$lib/client/products/memotron/common/linkbox/LinkBoxOnClipper.svelte";
  import { Position } from "$lib/client/types/direction.enum";
  import { cn } from "$lib/client/utils/ui.utils";
  import { onMount } from "svelte";
  import { feedbackPane, toolbarState, webpage } from "../contentScripts/store";
  import LinkItems from "$lib/client/products/memotron/common/linkbox/LinkItems.svelte";
  import InlineFeedbackText from "../InlineFeedbackText.svelte";
  import { AlertType } from "$lib/client/types/notification.type";
  import InlineMarkdownTextInput from "$lib/client/components/markdown/content/InlineMarkdownTextInput.svelte";
  import { NodeType } from "$lib/client/products/memotron/node/node.type";
  import { resolveContentTypeString } from "../clipper.utils";
  import { truncateString } from "$lib/shared/utils/text.utils";
  let notes: string = "";
  let autoCloseDuration = 30;
  let closeTimer: any;
  let closeActionTimestamp: number;
  let isHovering = false;
  let now = Date.now();
  $: contentTypeStr = resolveContentTypeString(
    $feedbackPane.focusedClip?.contentType
  );

  let notesTimeout: any;
  async function onNotesChange(e: CustomEvent) {
    $feedbackPane.feedback = "Saving...";
    if ($feedbackPane.focusedClip) {
      const response = await webpage.persistClipNotes(
        $feedbackPane.focusedClip.id,
        notes
      );
    } else $webpage.notes = notes;
    //TODO - TEMP - show feedback from result - getting result from debounded function
    clearTimeout(notesTimeout);
    notesTimeout = setTimeout(() => {
      $feedbackPane.feedback = "Notes saved!";
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
    feedbackPane.reset();
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
    $feedbackPane.feedback = "Linking...";
    let result;
    if (e.detail) {
      if ($feedbackPane.focusedClip)
        result = await webpage.linkClip($feedbackPane.focusedClip.id, e.detail);
      else result = await webpage.linkPage(e.detail);
    }
    $feedbackPane.feedback = result?.message
      ? result
      : { message: "Linking failed", type: AlertType.ERROR };
  }
  async function onUnlink(e) {
    $feedbackPane.feedback = "Removing link...";
    let result;
    if (e.detail) {
      if ($feedbackPane.focusedClip)
        result = await webpage.removeLinkForClip(
          $feedbackPane.focusedClip.id,
          e.detail
        );
      else result = await webpage.removeLinkForPage(e.detail);
    }
    $feedbackPane.feedback = result?.message
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
          label: `Link this ${contentTypeStr}`,
          tooltip: {
            body: `Link this ${contentTypeStr} to a node or add it to a collection by searching and clicking`
          }
        }}
      />
      <span class="h-6 w-6 flex justify-center items-center">
        {#if isHovering}
          <Button icon="cross-circled" on:click={closePane} />
        {:else if $feedbackPane.isShown}
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
  {#if $feedbackPane.focusedClip?.contentType === NodeType.WEB_SCREENSHOT_CLIP}
    <img
      src={$feedbackPane.focusedClip.body.s3Url}
      alt="Screenshot"
      class="w-full"
    />
  {:else if $feedbackPane.focusedClip?.contentType === NodeType.TWEET}
    <span class="text-b3">
      {truncateString($feedbackPane.focusedClip.body.content, 200)}
    </span>
  {/if}
  <InlineFeedbackText bind:feedback={$feedbackPane.feedback} />
</HoverableElement>
