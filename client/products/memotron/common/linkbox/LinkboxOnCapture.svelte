<script lang="ts">
  import { captureStore } from "$lib/client/products/memotron/capture/capture.store";
  import Divider from "$lib/client/elements/Divider.svelte";
  import { isValidArrayWithData } from "$lib/shared/utils/obj.utils";
  import Icon from "$lib/client/elements/Icon.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import { cn } from "$lib/client/utils/ui.utils";
  import LinkItems from "./LinkItems.svelte";
  import LinkSearch from "./LinkSearch.svelte";
  let link: string;
</script>

<section class="flex flex-col gap-2 w-full">
  <div class="h-8">
    {#if isValidArrayWithData($captureStore.links)}
      <LinkItems
        links={$captureStore.links?.map((x) => x.to)}
        on:unlink={(e) => {
          console.log("unlink", e);
          captureStore.removeDLink(e.detail);
        }}
      />
    {/if}
  </div>
  <Divider />
  <div class={cn("flex", "gap-2")}>
    <div class="flex gap-1">
      <Icon icon="arrow-up-right" size={Size.sm} />
    </div>
    <LinkSearch
      context="capture"
      searchQuery={link}
      on:select={(e) => {
        console.log("select", e.detail);
        captureStore.directLink(e.detail.item);
        link = "";
      }}
    />
  </div>
</section>
