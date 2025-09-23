<script lang="ts">
  import Icon from "$lib/client/elements/Icon.svelte";
  import { cn } from "$lib/client/utils/ui.utils";
  import { logger } from "$lib/client/components/debug/logger.client";
  import {
    feedbackPane,
    webpage
  } from "$lib/client/extensions/clipper/contentScripts/store";
  import { AlertType } from "$lib/client/types/notification.type";
  import type { NodeType } from "$lib/client/products/memotron/node/node.type";
  import { enumToString } from "$lib/shared/utils/text.utils";
  export let contentType: NodeType;
  let classList: string | undefined = undefined;
  export { classList as class };
  export let isHideLabel: boolean = false;
  let isSaving: boolean = false;
  let isSaved: boolean = false;
  $: contentTypeStr = enumToString(contentType);
  $: isSaved = !!$webpage.id;

  async function onClick(e: MouseEvent) {
    try {
      if (isSaving) return;
      feedbackPane.onPageSaveStart(`Saving ${contentTypeStr}...`);
      isSaving = true;
      if (isSaved) {
        feedbackPane.onPageSaved(
          `${contentTypeStr} already saved!`,
          AlertType.SUCCESS
        );
        isSaving = false;
        return;
      }
      await webpage.savePage({ contentType });
      feedbackPane.onPageSaved(`${contentTypeStr} saved!`);
    } catch (err) {
      logger.error(`Error saving ${contentTypeStr}`, err);
    } finally {
      isSaving = false;
    }
  }
</script>

<button
  class={cn(
    "flex items-center justify-center whitespace-nowrap gap-2 text-b2 hover:text-aps1 hover:border-aps1 px-2 min-h-[2rem] hover:bg-aps3 group",
    {
      "rounded-full mr-2": !classList,
      "border border-dashed border-fgs4": !isSaved && !isSaving,
      "border-[1.5px] border-brs3": isSaved || isSaving
    },
    classList
  )}
  on:click={onClick}
  disabled={isSaving}
>
  <Icon
    icon={isSaving
      ? "svg-spinners:3-dots-fade"
      : isSaved
        ? "mynaui:check-hexagon"
        : "mynaui:plus-hexagon"}
    isFilled={isSaved}
    class="group-hover:text-aps1"
  />
  {#if !isHideLabel}
    <span>{isSaved ? "Saved to Memotron" : "Save to Memotron"}</span>
  {/if}
</button>
