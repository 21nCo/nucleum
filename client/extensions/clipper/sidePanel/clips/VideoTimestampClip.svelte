<script lang="ts">
  import type { IVideoTimestampClip } from "$lib/client/products/memotron/node/node.type";
  import { TimeFormat } from "$lib/client/types/time.type";
  import { formatSeconds } from "$lib/client/utils/time.utils";
  import InlineMarkdownTextInput from "$lib/client/components/markdown/content/InlineMarkdownTextInput.svelte";
  import { AlertType } from "$lib/client/types/notification.type";
  import LinkBoxOnClipper from "$lib/client/products/memotron/common/linkbox/LinkBoxOnClipper.svelte";
  import LinkItems from "$lib/client/products/memotron/common/linkbox/LinkItems.svelte";
  import LinkActionOnClipper from "$lib/client/products/memotron/common/linkbox/LinkActionOnClipper.svelte";
  import Button from "$lib/client/elements/button/Button.svelte";
  import { relayToContentScript } from "$lib/client/utils/extension.utils";
  import { ClipperExtensionEvent } from "$lib/client/products/memotron/common/clip.type";
  import InlineFeedbackText from "../../InlineFeedbackText.svelte";
  import { onMount, createEventDispatcher } from "svelte";
  import FileView from "$lib/client/components/files/FileView.svelte";

  const dispatch = createEventDispatcher();

  export let clip: IVideoTimestampClip;
  let isLinkboxOpened: boolean = false;
  let isNotesOpened: boolean = false;
  let feedback: string | { message: string; type: AlertType } = "";
  let notes: string = "";
  refreshDerivedData();
  async function onNotesChange(e: CustomEvent) {
    feedback = "Saving...";
    const result = await relayToContentScript({
      event: ClipperExtensionEvent.CLIP_MUTATION,
      data: {
        action: "notes",
        clipId: clip.id,
        notes
      }
    });
    setTimeout(() => {
      feedback = "Notes saved!";
    }, 1000);
  }

  onMount(() => {
    feedback = "";
  });

  function refreshDerivedData() {
    notes = clip?.notes ?? "";
  }

  async function onLinkAction(e: CustomEvent, action: string = "link") {
    feedback = action === "link" ? "Linking..." : "Removing link...";
    let result;
    if (e.detail) {
      result = await relayToContentScript({
        event: ClipperExtensionEvent.CLIP_MUTATION,
        data: {
          action,
          clipId: clip.id,
          linkTo: e.detail
        }
      });
    }
    feedback = result?.id
      ? {
          message:
            action === "link" ? "Linking successful" : "Unlinking successful",
          type: AlertType.SUCCESS
        }
      : result?.message
        ? result
        : {
            message: action === "link" ? "Linking failed" : "Unlinking failed",
            type: AlertType.ERROR
          };
    if (!result?.id) return;
    clip = result;
    refreshDerivedData();
  }
  function onClick(e: PointerEvent | MouseEvent) {
    const target = e.target as HTMLElement;
    if (
      target.classList.contains("inline-markdown") ||
      e.pointerId === -1 ||
      target.nodeName === "svg"
    )
      return;
    dispatch("click");
  }
</script>

<button
  on:click={onClick}
  class="flex flex-col gap-2 border border-brs3 rounded-md p-2 hover:border-aps1"
>
  <span class="flex gap-4 justify-center items-center">
    <FileView
      id={clip.body.thumbnail}
      class="thumbnail w-32 h-[72px] rounded-md"
    />
    <div class="flex flex-col gap-1 items-start justify-between">
      <div class="font-medium text-h5">
        {formatSeconds(clip.body.timestamp, TimeFormat.CLOCK)}
      </div>
      <div class="flex gap-1 items-center">
        <LinkActionOnClipper links={clip?.links} bind:isLinkboxOpened />
        <Button
          icon={clip?.notes ? "document-text" : "document"}
          tooltip={clip?.notes ? "View notes" : "Add notes"}
          on:click={(e) => {
            isNotesOpened = !isNotesOpened;
            e.stopPropagation();
          }}
        />
      </div>
    </div>
  </span>
  {#if isLinkboxOpened}
    {#key clip}
      <LinkBoxOnClipper on:link={onLinkAction} />
      <LinkItems
        links={clip?.links}
        isWrapItems={true}
        on:click
        on:unlink={(e) => onLinkAction(e, "unlink")}
      />
    {/key}
  {/if}
  {#if isNotesOpened}
    <InlineMarkdownTextInput
      placeholder="Add notes"
      bind:content={notes}
      on:change={onNotesChange}
    />
  {/if}
  {#if feedback}
    <InlineFeedbackText bind:feedback />
  {/if}
</button>
