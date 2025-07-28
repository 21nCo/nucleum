<script lang="ts">
  import { onMount } from "svelte";
  import Button from "$lib/client/elements/button/Button.svelte";
  import LinkBoxOnClipper from "$lib/client/products/memotron/common/linkbox/LinkBoxOnClipper.svelte";
  import Divider from "$lib/client/elements/Divider.svelte";
  import LinkItems from "$lib/client/products/memotron/common/linkbox/LinkItems.svelte";
  import { webpage } from "./contentScripts/store";
  import InlineFeedbackText from "./InlineFeedbackText.svelte";
  import { AlertType } from "$lib/client/types/notification.type";
  import InlineMarkdownTextInput from "$lib/client/components/markdown/content/InlineMarkdownTextInput.svelte";
  import LinkActionOnClipper from "$lib/client/products/memotron/common/linkbox/LinkActionOnClipper.svelte";
  import { logger } from "$lib/client/components/debug/logger.client";
  import HighlightColors from "$lib/client/products/memotron/common/highlighters/HighlightColors.svelte";
  import { debouncer } from "$lib/client/utils/utils";
  import { determineResourceType } from "$lib/client/components/flux/resourceStores/resource.utils";
  import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
  import { ResourceError } from "$lib/client/components/error/errors";
  import { ButtonVariant } from "$lib/client/types/button.type";
  import Toggle from "$lib/client/elements/toggle/Toggle.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import { Orientation } from "$lib/client/types/direction.enum";
  import { cn } from "$lib/client/utils/ui.utils";

  export let id: string | null = null;
  export let selectedHighlighterId: string | null = null;
  export let feedback: { message: string; type: AlertType } | string = "";
  let isLinkboxOpened = false;
  let isNotesOpened = false;
  let clip: any;
  let notes: string = "";
  $: if (id) refreshClip(id, $webpage.clips);
  function refreshClip(id: string, clips: any[] | undefined = undefined) {
    if (!clips) {
      clips = $webpage.clips;
    }
    clip = clips?.find((c) => c.id.toString() === id.toString());
    notes = clip?.notes ?? "";
  }

  onMount(() => {
    feedback = "";
    if (id) refreshClip(id, $webpage.clips);
  });

  async function onNotesChange(e: CustomEvent) {
    feedback = { message: "Saving...", type: AlertType.PROGRESS };
    logger.log({ at: "onNotesChange", id, notes });
    const response = await webpage.persistClipNotes(id, notes);
    if (!response) {
      feedback = { message: "Notes save failed", type: AlertType.ERROR };
    } else {
      feedback = { message: "Notes saved!", type: AlertType.SUCCESS };
    }
  }

  const debouncedNotesChange = debouncer(onNotesChange, 1500);

  async function onPropertyUpdate(e: CustomEvent) {
    try {
      if (!e.detail || !e.detail?.id || e.detail?.value === undefined || !id)
        return;
      feedback = {
        message: "Syncing changes...",
        type: AlertType.PROGRESS
      };
      let result = await webpage.updateClipProperty(id, {
        id: e.detail.id,
        value: e.detail.value
      });
      if (!result) {
        feedback = {
          message: "Property update failed",
          type: AlertType.ERROR
        };
        return;
      }
      feedback = {
        message: "Synced!",
        type: AlertType.SUCCESS
      };
    } catch (error) {
      let errMessage = "Property update failed";
      if (error instanceof ResourceError) {
        errMessage = error.message;
      }
      feedback = {
        message: errMessage,
        type: AlertType.ERROR
      };
    }
  }

  async function onLink(e: CustomEvent) {
    try {
      if (!e.detail || !id) return;
      const resourceType = determineResourceType(e.detail);
      const feedbackMessage =
        resourceType === Resource.collection
          ? "Adding to collection..."
          : "Linking...";
      feedback = {
        message: feedbackMessage,
        type: AlertType.PROGRESS
      };
      let result = await webpage.linkClip(id, e.detail);
      if (!result) return;
      const successMessage =
        resourceType === Resource.collection
          ? "Added to collection!"
          : "Clip linked!";
      feedback = {
        message: successMessage,
        type: AlertType.SUCCESS
      };
      refreshClip(id);
    } catch (error) {
      let errMessage = "Linking failed";
      if (error instanceof ResourceError) {
        errMessage = error.message;
      }
      feedback = {
        message: errMessage,
        type: AlertType.ERROR
      };
    }
  }
</script>

<div
  class={cn(
    "shadow-md border border-brs2 bg-bgs1 rounded-md flex flex-col justify-center items-center px-4 py-3 gap-3 max-w-fit w-[26rem]",
    {
      "max-h-[20rem]": isNotesOpened
    }
  )}
>
  <div class="flex justify-center items-center gap-3">
    <!-- TODO test colors change from pdf annotator changes -->
    <HighlightColors bind:selected={selectedHighlighterId} on:color />
    {#if id}
      <Divider orientation={Orientation.Vertical} />
      <!-- <Button
        icon={isLinkboxOpened ? "link-arrow-down" : "link-arrow-left"}
        type={isLinkboxOpened ? ButtonVariant.PRIMARY : ButtonVariant.SECONDARY}
        label="link"
        size={Size.xs}
      /> -->
      <LinkActionOnClipper links={clip?.links} bind:isLinkboxOpened />
      <Toggle
        icon={notes ? "note" : "note"}
        tooltip={notes ? "View notes" : "Add notes"}
        bind:on={isNotesOpened}
        bgSize={Size.sm}
        on:change={(e) => {
          if (e.detail) isLinkboxOpened = false;
        }}
      />
      <Button
        icon="trash"
        tooltip="Delete clip"
        type={ButtonVariant.DANGER}
        on:click={async () => {
          let result = await webpage.removeClip(id);
          feedback = result?.message
            ? result
            : { message: "Clip removal failed", type: AlertType.ERROR };
        }}
      />
    {/if}
  </div>
  {#if isLinkboxOpened}
    <LinkBoxOnClipper on:link={onLink} />
    <LinkItems
      links={clip?.links}
      isWrapItems={true}
      nodeId={id}
      propertyValues={clip?.properties}
      on:propertyChange={onPropertyUpdate}
      isExpandable={true}
      on:click
      on:unlink={async (e) => {
        feedback = "Removing link...";
        let result;
        if (e.detail) result = await webpage.removeLinkForClip(id, e.detail);
        feedback = result?.message
          ? result
          : { message: "Unlinking failed", type: AlertType.ERROR };
        refreshClip(id);
      }}
    />
  {/if}
  {#if isNotesOpened}
    <!--TODO: Fix on:input event not accounting the last character -->
    <div class="w-full overflow-y-auto">
      <InlineMarkdownTextInput
        placeholder="Add notes"
        bind:content={notes}
        on:change={debouncedNotesChange}
      />
    </div>
  {/if}
  {#if feedback}
    <InlineFeedbackText bind:feedback isRenderEmptyHeight={true} />
  {/if}
</div>
