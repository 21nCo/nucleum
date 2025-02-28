<script lang="ts">
  import { isValidArrayWithData } from "$lib/shared/utils/obj.utils";
  import Icon from "$lib/client/elements/Icon.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import { cn } from "$lib/client/utils/ui.utils";
  import LinkItems from "./LinkItems.svelte";
  import LinkSearch from "./LinkSearch.svelte";
  import { createEventDispatcher } from "svelte";
  import { LinkType } from "../../node/node.type";
  import type { IRecordId } from "$lib/client/types/data.type";
  import { ResourceAccessPoint } from "$lib/client/components/flux/resourceStores/resource.type";
  import { isSameResource } from "$lib/client/components/flux/resourceStores/resource.utils";
  import type { IActiveCaptureStore } from "../../capture/capture.store";
  export let captureStore: IActiveCaptureStore;
  export let expand: IRecordId | null = null;
  const dispatch = createEventDispatcher();
  let link: string;
  async function propagatePropertyChanges(e: CustomEvent) {
    if (!e.detail || !e.detail?.id || e.detail?.value === undefined) return;
    captureStore.updateProperty({
      id: e.detail.id,
      value: e.detail.value
    });
  }
</script>

<section
  class="flex flex-col gap-4 w-full bg--bgs2 border border-brs3 rounded-md p-2"
>
  <div class={cn("flex", "gap-2")}>
    <div class="flex gap-1">
      <Icon icon="ph:link-light" size={Size.sm} />
    </div>
    <LinkSearch
      ctx="capture"
      searchQuery={link}
      on:select={async (e) => {
        if (!e.detail.item) return;
        await captureStore.directLink(e.detail.item);
        link = "";
        dispatch("linked", e.detail.item);
      }}
    />
  </div>

  {#if isValidArrayWithData($captureStore.links)}
    <div class="flex flex-col gap-2 overflow-y-auto styledscroll">
      <LinkItems
        {expand}
        accessPoint={ResourceAccessPoint.CAPTURE}
        isExpandable={true}
        links={$captureStore.links
          ?.filter((x) => x.linkType !== LinkType.MENTION)
          ?.map((x) => x.to) ?? []}
        nodeId={$captureStore.nodeId}
        propertyValues={$captureStore.properties}
        on:unlink={(e) => {
          if (expand && isSameResource(expand, e.detail)) {
            expand = null;
          }
          captureStore.removeDLink(e.detail);
          dispatch("unlinked", e.detail);
        }}
        on:propertyChange={propagatePropertyChanges}
      />
    </div>
  {/if}
</section>
