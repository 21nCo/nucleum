<script lang="ts">
  import Icon from "@21n/elements/Icon.svelte";
  import type { LinkThumbnail } from "@21n/products/memotron/node/node.type";
  import { cn } from "@21n/utils/ui.utils";
  import { createEventDispatcher } from "svelte";
  const dispatch = createEventDispatcher();
  export let link: LinkThumbnail;
  let isHovering: boolean = false;
  export let context: "capture" | "nodethumbnail" | "nodepage";
</script>

<span
  on:pointerenter={() => (isHovering = true)}
  on:pointerleave={() => (isHovering = false)}
  class={cn(
    "relative flex items-center gap-1 border border-brs3 rounded-full min-w-fit",
    {
      "py-1 px-6": context === "capture",
      "px-4": context !== "capture"
    }
  )}
>
  {link.label}
  {#if isHovering && !(context === "nodethumbnail")}
    <div
      class="absolute right-0 rounded-full bg-gradient-to-l from-bgs2 via-bgs2 to-transparent pr-2 pl-10 flex h-full items-center"
    >
      <Icon
        icon="cross"
        on:click={() => {
          dispatch("remove", link);
        }}
      />
    </div>
  {/if}
</span>
