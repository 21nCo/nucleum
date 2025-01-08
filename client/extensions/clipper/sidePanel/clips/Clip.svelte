<script lang="ts">
  import {
    NodeType,
    type ITextClip,
    type IVideoTimestampClip,
    type IWebScreenshotClip
  } from "$lib/client/products/memotron/node/node.type";
  import { TimeFormat } from "$lib/client/types/time.type";
  import { formatDatetime, formatSeconds } from "$lib/client/utils/time.utils";
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
  import TextClip from "./TextClip.svelte";
  import { hoverable } from "$lib/client/actions/hover.action";
  import { userPreferences } from "$lib/client/components/settings/userPreferences.store";
  import { debouncer } from "$lib/client/utils/utils";
  import { determineResourceType } from "$lib/client/components/flux/resourceStores/resource.utils";
  import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
  import Toggle from "$lib/client/elements/toggle/Toggle.svelte";
  import { Size } from "$lib/client/types/size.enum";

  const dispatch = createEventDispatcher();

  export let clip: IVideoTimestampClip | ITextClip | IWebScreenshotClip;
  let isLinkboxOpened: boolean = false;
  let isNotesOpened: boolean = false;
  let feedback: string | { message: string; type: AlertType } = "";
  let notes: string = "";
  let isHovered: boolean = false;
  refreshDerivedData();

  onMount(() => {
    feedback = "";
  });

  async function onNotesChange(e: CustomEvent) {
    feedback = {
      message: "Saving...",
      type: AlertType.PROGRESS
    };
    const result = await relayToContentScript({
      event: ClipperExtensionEvent.MUTATION_RELAY,
      data: {
        action: "notes",
        clipId: clip.id,
        notes
      }
    });
    console.log({ at: "Clip - onNotesChange", result });
    if (!result || result.error) {
      feedback = {
        message: result?.error ?? "Notes saving failed",
        type: AlertType.ERROR
      };
      return;
    }
    clip.notes = notes;
    feedback = {
      message: "Notes saved!",
      type: AlertType.SUCCESS
    };
  }

  const debouncedNotesChange = debouncer(onNotesChange, 1500);

  function refreshDerivedData() {
    notes = clip?.notes ?? "";
  }

  async function onLinkAction(e: CustomEvent, action: string = "link") {
    if (!e.detail) return;
    const resourceType = determineResourceType(e.detail);
    let feedbackMessage = "";
    if (resourceType === Resource.collection) {
      feedbackMessage =
        action === "link"
          ? "Adding to collection..."
          : "Removing from collection...";
    } else {
      feedbackMessage = action === "link" ? "Linking..." : "Removing link...";
    }
    feedback = {
      message: feedbackMessage,
      type: AlertType.PROGRESS
    };
    const result = await relayToContentScript({
      event: ClipperExtensionEvent.MUTATION_RELAY,
      data: {
        action,
        clipId: clip.id,
        linkTo: e.detail
      }
    });
    console.log({ at: "Clip - onLinkAction", result });
    if (!result || result.error) {
      feedback = {
        message: result?.error ?? "Linking failed",
        type: AlertType.ERROR
      };
      return;
    }
    let successMessage = "";
    if (resourceType === Resource.collection) {
      successMessage =
        action === "link" ? "Added to collection!" : "Removed from collection!";
    } else {
      successMessage = action === "link" ? "Clip linked!" : "Link removed!";
    }
    feedback = {
      message: successMessage,
      type: AlertType.SUCCESS
    };
    if (result.clip) clip = result.clip;
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

  async function onDelete(e) {
    e.stopPropagation();
    const result = await relayToContentScript({
      event: ClipperExtensionEvent.MUTATION_RELAY,
      data: {
        action: "delete",
        clipId: clip.id
      }
    });
    dispatch("delete");
  }

  async function onPropertyChanges(e: CustomEvent) {
    if (!e.detail || !e.detail?.id || e.detail?.value === undefined) return;
    feedback = {
      message: "Syncing changes...",
      type: AlertType.PROGRESS
    };
    const result = await relayToContentScript({
      event: ClipperExtensionEvent.MUTATION_RELAY,
      data: {
        action: "property",
        clipId: clip.id,
        property: e.detail
      }
    });
    if (!result || result.error) {
      feedback = {
        message: result?.error ?? "Property update failed",
        type: AlertType.ERROR
      };
      return;
    }
    feedback = {
      message: "Synced!",
      type: AlertType.SUCCESS
    };
    if (result.clip.properties) clip.properties = result.clip.properties;
  }
</script>

<button
  on:click={onClick}
  class="relative flex flex-col gap-2 border border-brs2 rounded-md p-3 hover:border-brs3"
  use:hoverable={{
    onHover: (e) => {
      isHovered = e;
    }
  }}
>
  {#if clip.contentType === NodeType.TEXT_CLIP || clip.contentType === NodeType.WEB_SCREENSHOT_CLIP}
    <div class="flex flex-col gap-2 text-left">
      <TextClip {clip} on:click on:keydown />
      <div
        class="flex gap-1 justify-between bg-bgs1 rounded-md px-1 h-8 items-center"
      >
        <span class="text-b4 text-fgs2">
          {formatDatetime($userPreferences, clip.createdAt)}
        </span>
        {#if isHovered || clip?.notes || clip?.links.length}
          <span class="flex gap-1 items-center">
            {#if isHovered || clip?.links.length}
              <LinkActionOnClipper
                links={clip?.links}
                bind:isLinkboxOpened
                on:change={(e) => {
                  if (e.detail) isNotesOpened = false;
                }}
              />
            {/if}
            {#if isHovered || clip?.notes}
              <Toggle
                icon={clip?.notes ? "document-text" : "document"}
                tooltip={clip?.notes ? "View notes" : "Add notes"}
                bind:on={isNotesOpened}
                bgSize={Size.sm}
                on:change={(e) => {
                  if (e.detail) isLinkboxOpened = false;
                }}
              />
            {/if}
            {#if isHovered}
              <Button icon="trash" tooltip="Delete clip" on:click={onDelete} />
            {/if}
          </span>
        {/if}
      </div>
    </div>
  {:else if clip.contentType === NodeType.YOUTUBE_TIMESTAMP_CLIP && "timestamp" in clip.body}
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
          <LinkActionOnClipper
            links={clip?.links}
            bind:isLinkboxOpened
            on:change={(e) => {
              if (e.detail) isNotesOpened = false;
            }}
          />
          <Toggle
            icon={clip?.notes ? "document-text" : "document"}
            tooltip={clip?.notes ? "View notes" : "Add notes"}
            bind:on={isNotesOpened}
            bgSize={Size.sm}
            on:change={(e) => {
              if (e.detail) isLinkboxOpened = false;
            }}
          />
          {#if isHovered}
            <Button icon="trash" tooltip="Delete clip" on:click={onDelete} />
          {/if}
        </div>
      </div>
    </span>
  {/if}
  {#if isLinkboxOpened}
    <LinkBoxOnClipper on:link={onLinkAction} />
    <LinkItems
      links={clip?.links}
      nodeId={clip.id}
      propertyValues={clip?.properties}
      isWrapItems={true}
      isExpandable={true}
      on:click
      on:unlink={(e) => onLinkAction(e, "unlink")}
      on:propertyChange={onPropertyChanges}
    />
  {/if}
  {#if isNotesOpened}
    <InlineMarkdownTextInput
      placeholder="Add notes"
      bind:content={notes}
      on:change={debouncedNotesChange}
    />
  {/if}
  {#if feedback}
    <InlineFeedbackText bind:feedback />
  {/if}
</button>
