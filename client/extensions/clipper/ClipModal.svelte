<script lang="ts">
  import { ResourceAccessPoint } from "$lib/client/components/flux/resourceStores/resource.type";
  import InlineMarkdownTextInput from "$lib/client/components/markdown/content/InlineMarkdownTextInput.svelte";
  import Button from "$lib/client/elements/button/Button.svelte";
  import { feedbackPane } from "$lib/client/extensions/clipper/contentScripts/store";
  import LinkBoxOnClipper from "$lib/client/products/memotron/common/linkbox/LinkBoxOnClipper.svelte";
  import LinkItems from "$lib/client/products/memotron/common/linkbox/LinkItems.svelte";
  import {
    NodeType,
    type IClip
  } from "$lib/client/products/memotron/node/node.type";
  import NodeTitle from "$lib/client/products/memotron/node/title/NodeTitle.svelte";
  import { ButtonStyle, ButtonVariant } from "$lib/client/types/button.type";
  import { fly } from "svelte/transition";
  import { resumeVideo } from "./parsers/shared/video.utils";
  import InlineFeedbackText from "./InlineFeedbackText.svelte";
  import { AlertType } from "$lib/client/types/notification.type";
  import { determineResourceType } from "$lib/client/components/flux/resourceStores/resource.utils";
  import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
  export let clip: IClip;
  export let onAction: (data: any) => Promise<any>;
  let feedback: string | { message: string; type: AlertType } = "";

  let _clip = {
    ...clip,
    isInEditMode: !clip.label
  };

  async function onLabelChanges(e: CustomEvent) {
    if (!e.detail || e.detail === undefined) return;
    feedback = {
      message: "Syncing changes...",
      type: AlertType.PROGRESS
    };
    const result = await onAction({
      action: "label",
      clipId: clip.id,
      label: e.detail
    });
    if (!result || result.error) {
      feedback = {
        message: result?.error ?? "Title update failed",
        type: AlertType.ERROR
      };
      return;
    }
    feedback = {
      message: "Title updated!",
      type: AlertType.SUCCESS
    };
    if (result.clip?.label) {
      clip.label = result.clip.label;
    }
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
    const result = await onAction({
      action,
      clipId: clip.id,
      linkTo: e.detail
    });
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
    if (result.clip) _clip = result.clip;
  }

  async function onPropertyChanges(e: CustomEvent) {
    if (!e.detail || !e.detail?.id || e.detail?.value === undefined) return;
    feedback = {
      message: "Syncing changes...",
      type: AlertType.PROGRESS
    };
    const result = await onAction({
      action: "property",
      clipId: clip.id,
      property: e.detail
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

  async function onNotesChange(e: CustomEvent) {
    feedback = {
      message: "Saving...",
      type: AlertType.PROGRESS
    };
    const result = await onAction({
      action: "notes",
      clipId: clip.id,
      notes: _clip.notes
    });
    if (!result || result.error) {
      feedback = {
        message: result?.error ?? "Notes saving failed",
        type: AlertType.ERROR
      };
      return;
    }
    feedback = {
      message: "Notes saved!",
      type: AlertType.SUCCESS
    };
  }

  function close(e?: PointerEvent) {
    if (
      e &&
      e.target &&
      (!(e.target as HTMLElement).classList.contains("overlay") ||
        e.detail === 0)
    )
      return;
    feedbackPane.closeModalClip();
    if (
      _clip.isResumeVideoOnClose &&
      (_clip.contentType === NodeType.VIDEO_BOOKMARK ||
        _clip.contentType === NodeType.YOUTUBE_BOOKMARK)
    ) {
      resumeVideo();
    }
  }
</script>

<button
  class="overlay fixed inset-0 bg-black/20 z-50"
  transition:fly={{
    y: 10,
    duration: 300
  }}
  on:click={close}
>
  <div
    class="absolute inset-x-0 mx-auto bottom-4 bg-bgs1 w-[40rem] max-w-full h-[30rem] p-4 rounded-md shadow-md"
  >
    <div class="flex justify-between items-center gap-2 h-16 min-h-16">
      <NodeTitle
        node={_clip}
        accessPoint={ResourceAccessPoint.CLIPPER}
        on:labelChange={onLabelChanges}
        on:editModeChange={(e) => {
          _clip.isInEditMode = e.detail;
        }}
      />
      <div class="flex items-center gap-2">
        {#if !_clip.isInEditMode}
          <Button
            icon="edit"
            tooltip="Edit title"
            style={ButtonStyle.OUTLINED}
            on:click={() => {
              _clip.isInEditMode = true;
            }}
          />
        {/if}
        <Button
          icon="trash"
          tooltip="Delete bookmark"
          style={ButtonStyle.OUTLINED}
          type={ButtonVariant.DANGER}
          on:click={() => {
            onAction({
              action: "delete",
              clipId: clip.id
            });
            close();
          }}
        />
        <Button
          icon="cross"
          tooltip="Close"
          id="close-btn"
          style={ButtonStyle.OUTLINED}
          on:click={() => close()}
        />
      </div>
    </div>
    <div class="flex flex-col gap-2 w-full h-96">
      <LinkBoxOnClipper on:link={onLinkAction} />
      <LinkItems
        links={_clip?.links}
        nodeId={_clip?.id}
        propertyValues={_clip?.properties}
        isWrapItems={true}
        isExpandable={true}
        accessPoint={ResourceAccessPoint.CLIPPER}
        subContext="clipper-modal"
        on:click
        on:unlink={(e) => onLinkAction(e, "unlink")}
        on:propertyChange={onPropertyChanges}
      />
      <div class="bg-bgs2 rounded-md flex-grow w-full py-1 px-2">
        <InlineMarkdownTextInput
          placeholder="Add notes"
          bind:content={_clip.notes}
          on:debouncedChange={onNotesChange}
        />
      </div>
      {#if feedback}
        <InlineFeedbackText bind:feedback isRenderEmptyHeight={true} />
      {/if}
    </div>
  </div>
</button>
