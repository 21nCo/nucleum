<script lang="ts">
  import Icon from "$lib/client/elements/Icon.svelte";
  import type { LinkThumbnail } from "$lib/client/types/memotron/node.type";
  import { createEventDispatcher } from "svelte";
  const dispatch = createEventDispatcher();
  export let link: LinkThumbnail;
  let isHovering: boolean = false;
  export let context: "capture" | "nodethumbnail" | "nodepage";
</script>

<span
  on:pointerenter={() => (isHovering = true)}
  on:pointerleave={() => (isHovering = false)}
  class="relative flex items-center gap-1 border border-brs3 rounded-full min-w-fit {context ===
  'capture'
    ? 'py-1 px-6'
    : ' px-4'}"
>
  {link.label}
  {#if isHovering && !(context === "nodethumbnail")}
    <div
      class="absolute right-0 rounded-full bg-gradient-to-l from-bgs2 via-bgs2 to-transparent pr-2 pl-10"
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
