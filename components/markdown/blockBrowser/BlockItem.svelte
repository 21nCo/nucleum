<script lang="ts">
  import Icon from "$lib/tidy/elements/Icon.svelte";
  import type { InlineType } from "$lib/tidy/types/memotron/md.type";
  import type { NodeType } from "$lib/tidy/types/memotron/node.type";
  import { Size } from "$lib/tidy/types/size.enum";
  import { createEventDispatcher } from "svelte";
  export let block: {
    label: string;
    type: NodeType | InlineType;
    icon: string;
  };
  export let width: string = "w-full";
  export let isFocused: boolean = false;
  const dispatch = createEventDispatcher();
  let ref: HTMLElement;
  $: if (isFocused && ref) {
    ref.scrollIntoView({ behavior: "smooth", block: "end" });
  }
</script>

<button
  bind:this={ref}
  class="flex items-center gap-3 text-b2 hover:bg-bgs2 py-1 px-2 rounded-md {width} {isFocused
    ? 'bg-bgs2'
    : ''}"
  on:click={() => dispatch("select", block)}
>
  <div class="bg-bgs2 rounded-md p-1 border border-brs3">
    <Icon icon={block.icon} />
  </div>
  <div>{block.label}</div>
</button>
