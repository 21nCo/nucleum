<script lang="ts">
  import type { IContextMenuItem } from "$lib/client/types/select.type";
  import { Size } from "$lib/client/types/size.enum";
  import { cn } from "$lib/client/utils/ui.utils";
  import Divider from "../Divider.svelte";
  import Text from "../text/Text.svelte";
  import { TextStyle } from "$lib/client/types/text.enum";
  import ContextMenuItem from "./ContextMenuItem.svelte";
  import ContextMenuItemWithSecondary from "./ContextMenuItemWithSecondary.svelte";
  import { appStore } from "$lib/client/stores/app.store";

  export let menu: { group: string; items: IContextMenuItem[] }[];
  export let size: Size.sm | Size.md | Size.lg = Size.md;
  export let heading: string | undefined = undefined;
  export let onSelect: (item: IContextMenuItem) => void = () => {};
</script>

<div
  class={cn("flex flex-col gap-1 p-1 bg-bgs2", {
    "w-36 text-b3": size === Size.sm,
    "w-48 text-b2": size === Size.md,
    "w-56 text-b2": size === Size.lg
  })}
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
    <div class="flex flex-col">
      {#each group.items as item}
        {#if item.secondStepComponent?.component}
          <ContextMenuItemWithSecondary {item} {size} on:select on:action />
        {:else}
          <button
            class={cn(
              "flex items-center gap-2.5 justify-between hover:bg-bgs3 rounded-md",
              {
                "p-1.5": size === Size.sm,
                "p-2": size === Size.md,
                "px-3 py-2": size === Size.lg
              }
            )}
            on:click={(e) => {
              if (item.callback) item.callback();
              else if (item.action) appStore.runAction(item.action);
              onSelect(item);
              e.stopPropagation();
            }}
          >
            <ContextMenuItem {item} />
          </button>
        {/if}
      {/each}
    </div>
    {#if index !== menu.length - 1}
      <Divider />
    {/if}
  {/each}
</div>
