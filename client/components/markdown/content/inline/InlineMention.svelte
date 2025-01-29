<script lang="ts">
  import { hoverable } from "$lib/client/actions/hover.action";
  import { tooltip } from "$lib/client/actions/popover.action";
  import { logger } from "$lib/client/components/debug/logger.client";
  import { resolveResource } from "$lib/client/components/record/record.store";
  import { resolveNodeLabelString } from "$lib/client/products/memotron/node/node.utils";
  import { isValidString } from "$lib/shared/utils/text.utils";
  import { onMount } from "svelte";

  export let id: string;
  export let label: string | null = null;
  let resource: any;
  let isLoading: boolean = true;
  let isHovering: boolean = false;

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

<a
  class="inline-mention px-1 bg-bgs2 notouch:hover:bg-bgs3 active:bg-bgs3 rounded-md max-w-48 truncate"
  data-record-id={id}
  data-label={label}
  href={`?pop=${id}`}
  contenteditable="false"
  use:hoverable={{
    onHover: (val) => {
      isHovering = val;
    }
  }}
  use:tooltip={{
    text: `Go to **${label ?? "unknown"}**`,
    delay: 1500
  }}
>
  <span style="">
    <!-- TODO - applying below font-size is causing subtle flickering -->
    <!-- {#if isHovering}
      <span style="font--size: 0.85rem;"> &rarr; </span>
    {:else} -->
    <span style="font--size: 1.1rem; vertical-align: 0.06em;">
      {#if isHovering}
        &#11042;
      {:else}
        &#11041;
      {/if}
    </span>
    <!-- {/if} -->
  </span>
  <span class="text-wrap truncate">
    {#if isLoading}
      {label ?? "Loading..."}
    {:else}
      {isValidString(resolveNodeLabelString(resource)) ?? "Unknown"}
    {/if}
  </span>
</a>
