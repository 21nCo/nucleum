<script lang="ts">
  import Button from "$lib/client/elements/button/Button.svelte";
  import FormControlLabel from "$lib/client/elements/text/formLabel/FormControlLabel.svelte";
  import LinkBoxOnClipper from "$lib/client/products/memotron/common/linkbox/LinkBoxOnClipper.svelte";
  import { onMount } from "svelte";
  import { feedbackPane, webpage } from "../contentScripts/store";
  import LinkItems from "$lib/client/products/memotron/common/linkbox/LinkItems.svelte";
  import InlineFeedbackText from "../InlineFeedbackText.svelte";
  import { AlertType } from "$lib/client/types/notification.type";
  import InlineMarkdownTextInput from "$lib/client/components/markdown/content/InlineMarkdownTextInput.svelte";
  import { NodeType } from "$lib/client/products/memotron/node/node.type";
  import { resolveContentTypeString } from "../clipper.utils";
  import FeedbackPaneBase from "./FeedbackPaneBase.svelte";
  import FileView from "$lib/client/components/files/FileView.svelte";
  import type { IRecordId } from "$lib/client/types/data.type";
  import {
    determineResourceType,
    resourceInList
  } from "$lib/client/components/flux/resourceStores/resource.utils";
  import NodeThumbnailTweetPreview from "$lib/client/products/memotron/node/thumbnail/NodeThumbnailTweetPreview.svelte";
  import { Placement } from "$lib/client/types/direction.enum";
  import type { IWebpageStore } from "../contentScripts/types";
  import { logger } from "$lib/client/components/debug/logger.client";
  import { debouncer } from "$lib/client/utils/utils";
  import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
  import { ResourceError } from "$lib/client/components/error/errors";
  let notes: string =
    ($feedbackPane.focusedClip
      ? $feedbackPane.focusedClip.notes
      : $webpage?.notes) ?? "";
  let autoCloseDuration = 40;
  let closeTimer: any;
  let closeActionTimestamp: number;
  let isHovering = false;
  let now = Date.now();
  let isPropsExpanded = false;

  $: contentTypeStr = resolveContentTypeString(
    $feedbackPane.focusedClip?.contentType
  );

  $: linkItems = resolveLinkItems($webpage.links, $feedbackPane.focusedClip);

  $: propertyValues = resolvePropertyValues(
    $webpage,
    $feedbackPane.focusedClip?.id
  );

  function resolvePropertyValues(
    page: IWebpageStore,
    clip: IRecordId | undefined
  ) {
    if (!clip) return page.properties;
    const clipProperties = $feedbackPane.focusedClip?.properties;
    return clipProperties;
  }

  function resolveLinkItems(links: IRecordId[], focusedClip: IRecordId) {
    if (!focusedClip) return links;
    let clipLinks = $webpage.clips?.find(resourceInList(focusedClip))?.links;
    if (!clipLinks) return [];
    return [...clipLinks];
  }

  async function onNotesChange(e: CustomEvent) {
    $feedbackPane.feedback = {
      message: "Saving...",
      type: AlertType.PROGRESS
    };
    let response;
    if ($feedbackPane.focusedClip) {
      response = await webpage.persistClipNotes(
        $feedbackPane.focusedClip.id,
        notes
      );
    } else {
      response = await webpage.persistPageNotes(notes);
    }
    if (!response) {
      $feedbackPane.feedback = {
        message: "Notes failed to save",
        type: AlertType.ERROR
      };
    } else {
      $feedbackPane.feedback = {
        message: "Notes saved!",
        type: AlertType.SUCCESS
      };
    }
  }

  const onNotesChangeDebounced = debouncer(onNotesChange, 2000);

  function onHover() {
    restartCloseTimer();
  }

  onMount(() => {
    restartCloseTimer();
    const sub = feedbackPane.subscribe((n) => {
      if (n.isPreventAutoClose === false) {
        restartCloseTimer();
      }
    });
    return () => {
      clearTimeout(closeTimer);
      sub();
    };
  });

  function closePane() {
    feedbackPane.reset();
  }

  function restartCloseTimer() {
    clearTimeout(closeTimer);
    if (isHovering || $feedbackPane.isPreventAutoClose) {
      return;
    }
    closeActionTimestamp = Date.now();
    closeTimer = setTimeout(() => {
      closePane();
    }, autoCloseDuration * 1000);
  }

  async function onLink(e: CustomEvent) {
    try {
      if (!e.detail) return;
      const resourceType = determineResourceType(e.detail);
      const feedbackMessage =
        resourceType === Resource.collection
          ? "Adding to collection..."
          : "Linking...";
      $feedbackPane.feedback = {
        message: feedbackMessage,
        type: AlertType.PROGRESS
      };
      let result;
      if ($feedbackPane.focusedClip)
        result = await webpage.linkClip($feedbackPane.focusedClip.id, e.detail);
      else result = await webpage.linkPage(e.detail);
      if (!result) return;
      const successMessage =
        resourceType === Resource.collection
          ? "Added to collection!"
          : "Clip linked!";
      $feedbackPane.feedback = {
        message: successMessage,
        type: AlertType.SUCCESS
      };
    } catch (error) {
      let errMessage = "Linking failed";
      if (error instanceof ResourceError) {
        errMessage = error.message;
      }
      $feedbackPane.feedback = {
        message: errMessage,
        type: AlertType.ERROR
      };
    }
  }
  async function onUnlink(e: CustomEvent) {
    if (!e.detail) return;
    const resourceType = determineResourceType(e.detail);
    const feedbackMessage =
      resourceType === Resource.collection
        ? "Removing from collection..."
        : "Removing link...";
    $feedbackPane.feedback = {
      message: feedbackMessage,
      type: AlertType.PROGRESS
    };
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
      ? {
          message:
            resourceType === Resource.collection
              ? "Removed from collection!"
              : result.message,
          type: result.type
        }
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

  async function onPropertyUpdate(e: CustomEvent) {
    if (!e.detail || !e.detail?.id || e.detail?.value === undefined) return;
    $feedbackPane.feedback = {
      message: "Syncing changes...",
      type: AlertType.PROGRESS
    };
    logger.log({
      at: "onPropertyUpdate",
      detail: e.detail,
      fc: $feedbackPane.focusedClip
    });
    let response;
    if ($feedbackPane.focusedClip)
      response = await webpage.updateClipProperty(
        $feedbackPane.focusedClip.id,
        {
          id: e.detail.id,
          value: e.detail.value
        }
      );
    else
      response = await webpage.updatePageProperty({
        id: e.detail.id,
        value: e.detail.value
      });
    if (!response || response.error) {
      $feedbackPane.feedback = {
        message: response?.error ?? "Property update failed! Please try again.",
        type: AlertType.ERROR
      };
      return;
    }
    $feedbackPane.feedback = {
      message: "Synced!",
      type: AlertType.SUCCESS
    };
  }

  function onExpansion(e: CustomEvent) {
    isPropsExpanded = e.detail === "has-props";
  }
</script>

<FeedbackPaneBase bind:isHovering on:hover={onHover}>
  {#if !$feedbackPane.isShowStatusOnly}
    <div class="flex flex-col w-full gap-2">
      <div class="flex w-full justify-between items-center">
        <!-- <span class="text-fgs3 text-b2"> Link this page </span> -->
        <FormControlLabel
          props={{
            label: `Link this ${contentTypeStr}`,
            tooltip: {
              body: `Link this ${contentTypeStr} to a node or add it to a collection by searching and clicking`,
              isUseAbsolutePositioning: true,
              placement: Placement.TopCenter
            }
          }}
        />
        <span class="h-6 w-6 flex justify-center items-center">
          {#if isHovering}
            <Button icon="cross-circled" on:click={closePane} />
          {:else if $feedbackPane.isShown && countdown > 0 && !Number.isNaN(countdown)}
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
        links={linkItems}
        {propertyValues}
        nodeId={$feedbackPane.focusedClip?.id ?? $webpage.id}
        isExpandable={true}
        on:propertyChange={onPropertyUpdate}
        on:click={onLinkClick}
        on:unlink={onUnlink}
        on:expansion={onExpansion}
        isWrapItems={true}
      />
    </div>
    {#if !isPropsExpanded}
      <div class="flex w-full justify-center bg-bgs2 rounded-md px-2 py-1">
        <!-- Fix placeholder color issue -->
        <InlineMarkdownTextInput
          placeholder="Add notes"
          bind:content={notes}
          on:change={onNotesChangeDebounced}
          on:input={onNotesChangeDebounced}
          on:focus={() => {
            $feedbackPane.isPreventAutoClose = true;
          }}
          on:blur={() => {
            $feedbackPane.isPreventAutoClose = false;
          }}
        />
      </div>
      {#if $feedbackPane.focusedClip?.contentType === NodeType.WEB_SCREENSHOT_CLIP}
        <!-- <img
      src={$feedbackPane.focusedClip.body.s3Url}
      alt="Screenshot"
      class="w-full"
    /> -->
        <FileView
          id={$feedbackPane.focusedClip.body?.file}
          class="h-full w-full max-h-40 object-cover"
        />
      {:else if $feedbackPane.focusedClip?.contentType === NodeType.TWEET}
        <span
          class="text-b2 p-1 border border-brs2 rounded-md overflow-clip max-h-40"
        >
          <NodeThumbnailTweetPreview
            text={$feedbackPane.focusedClip.body.content}
          />
        </span>
      {/if}
    {/if}
  {/if}
  <InlineFeedbackText bind:feedback={$feedbackPane.feedback} />
</FeedbackPaneBase>
