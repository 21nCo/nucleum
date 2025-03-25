<script lang="ts">
  import type {
    IContextMenuGroup,
    IContextMenuItem
  } from "$lib/client/types/select.type";
  import { Size } from "$lib/client/types/size.enum";
  import { bg, cn } from "$lib/client/utils/ui.utils";
  import Divider from "../Divider.svelte";
  import Text from "../text/Text.svelte";
  import { TextStyle } from "$lib/client/types/text.enum";
  import ContextMenuItem from "./ContextMenuItem.svelte";
  import { onMount } from "svelte";
  import { ColorStrength } from "$lib/client/types/appearance.type";
  export let menuResolver: () => { group: string; items: IContextMenuItem[] }[];
  export let size: Size.sm | Size.md | Size.lg | Size.xl = Size.md;
  export let heading: string | undefined = undefined;
  export let onSelect: (item: IContextMenuItem) => void = () => {};
  export let parentBgIndex: number = 1;
  export let isFullWidth: boolean = false;
  let menu: IContextMenuGroup[] = [];

  onMount(() => {
    if (!menuResolver) return;
    const resolution = menuResolver();
    menu = resolution;
  });
</script>

<div
  class={cn(
    "flex flex-col gap-1 p-1 border border-brs2 rounded-md",
    bg(parentBgIndex),
    {
      "w-full": isFullWidth,
      "text-b3": size === Size.sm,
      "text-b2": size === Size.md || size === Size.lg || size === Size.xl
    },
    !isFullWidth && {
      "w-48": size === Size.sm,
      "w-56": size === Size.md,
      "w-64": size === Size.lg,
      "w-72": size === Size.xl
    }
  )}
>
  {#if heading}
    <span
      class={cn("w-full px-2 text-left", {
        "px-1.5": size === Size.sm,
        "px-2": size === Size.md,
        "px-3": size === Size.lg
      })}
    >
      <Text content={heading} style={TextStyle.SECTION_HEADING_SMALL} />
    </span>
  {/if}
  {#each menu as group, index}
    <div
      class={cn("flex", {
        "flex-col": !group.isToggleGroup,
        "flex-row justify-around p-2 gap-2": group.isToggleGroup
      })}
    >
      {#each group.items as item}
        <ContextMenuItem
          {item}
          {size}
          isToggleGroup={group.isToggleGroup}
          {parentBgIndex}
          on:select={() => onSelect(item)}
        />
      {/each}
    </div>
    {#if index !== menu.length - 1}
      <Divider colorStrength={ColorStrength.Strong} />
    {/if}
  {/each}
</div>
