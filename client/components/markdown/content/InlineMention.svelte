<script lang="ts">
  import { resolveResource } from "$lib/client/products/memotron/memotron.store";
  import { resolveNodeLabelString } from "$lib/client/products/memotron/node/node.utils";
  import { appStore } from "$lib/client/stores/app.store";
  import { isValidString, truncateString } from "$lib/shared/utils/text.utils";
  import { onMount } from "svelte";
  import { logger } from "../../debug/logger.client";
  export let id: string;
  export let label: string | null = null;
  let resource: any;
  let isLoading: boolean = true;
  onMount(async () => {
    try {
      isLoading = true;
      resource = await resolveResource(id);
    } catch (e) {
      logger.error({ at: "InlineMention.onMount", error: e });
    } finally {
      isLoading = false;
    }
  });
</script>

<button
  {id}
  contenteditable="false"
  class="mention inline-block hover:bg-aps3 px-0.5 rounded-md text-aps1"
  on:click|stopPropagation={(e) => appStore.resourceClickHandler(e, id)}
>
  <span class="underline-dotted-primary">
    {#if isLoading}
      {label ?? "Adding..."}
    {:else}
      {isValidString(truncateString(resolveNodeLabelString(resource), 50)) ??
        "Unknown"}
    {/if}
  </span>
</button>
