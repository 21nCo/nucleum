<script lang="ts">
  import { hoverable } from "$lib/client/actions/hover.action";
  import { cn } from "$lib/client/utils/ui.utils";
  import { truncateString } from "$lib/shared/utils/text.utils";
  import Icon from "$lib/client/elements/Icon.svelte";
  import { createEventDispatcher } from "svelte";
  import { Size } from "$lib/client/types/size.enum";
  import Badge from "./Badge.svelte";
  const dispatch = createEventDispatcher();
  export let label: string;
  export let parentBgIndex: number = 1;
  export let icon: string | undefined = undefined;
  export let size: Size.sm | Size.md = Size.md;
  export let isRemovable = true;
  export let isActive = false;
  export let count: number | undefined = undefined;
  let isHovering = false;
</script>

<button
  class={cn(
    "relative flex gap-2 items-center justify-center whitespace-nowrap border min-w-20",
    {
      "text-b3 px-2 py-0.5 rounded-md": size === Size.sm,
      "text-b2 px-3 py-1 rounded-full": size === Size.md,
      "border-brs3": !isActive,
      "border-aps1": isActive
    }
  )}
  on:click
  use:hoverable
  on:hover={(e) => (isHovering = e.detail)}
>
  {#if icon}
    <Icon {icon} size={Size.sm} />
  {/if}
  {label ? truncateString(label, 24) : ""}
  {#if count !== undefined}
    <Badge text={count} size={size === Size.sm ? Size.xs : Size.sm} />
  {/if}
  {#if isHovering && isRemovable}
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
