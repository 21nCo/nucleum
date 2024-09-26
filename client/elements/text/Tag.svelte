<script lang="ts">
  import { hoverable } from "$lib/client/actions/hover.action";
  import { cn } from "$lib/client/utils/ui.utils";
  import { truncateString } from "$lib/shared/utils/text.utils";
  import Icon from "$lib/client/elements/Icon.svelte";
  import { createEventDispatcher } from "svelte";
  import { Size } from "$lib/client/types/size.enum";
  const dispatch = createEventDispatcher();
  export let label: string;
  export let parentBgIndex: number = 1;
  export let icon: string | undefined = undefined;
  let isHovering = false;
</script>

<button
  class="relative flex gap-2 items-center justify-center text-b2 whitespace-nowrap border border-brs3 rounded-full px-5 py-1 min-w-20"
  on:click
  use:hoverable
  on:hover={(e) => (isHovering = e.detail)}
>
  {#if icon}
    <Icon {icon} size={Size.sm} />
  {/if}
  {label ? truncateString(label, 24) : ""}
  {#if isHovering}
    <button
      class={cn(
        "absolute top-0 right-0 rounded-full bg-gradient-to-l  to-transparent pr-2 pl-3 flex h-full items-center",
        {
          "from-bgs1 via-bgs1": parentBgIndex === 1,
          "from-bgs2 via-bgs2": parentBgIndex === 2,
          "from-bgs3 via-bgs3": parentBgIndex === 3
        }
      )}
      on:click={(e) => {
        dispatch("remove");
        e.stopPropagation();
      }}
    >
      <Icon icon="cross" />
    </button>
  {/if}
</button>
