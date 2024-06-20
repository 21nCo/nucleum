<script lang="ts">
  import type { IContextMenuItem } from "$lib/client/types/select.type";
  import { Size } from "$lib/client/types/size.enum";
  import { properCase } from "$lib/client/utils/text.utils";
  import { cn } from "$lib/client/utils/ui.utils";
  import { createEventDispatcher } from "svelte";
  import Divider from "../Divider.svelte";
  import Icon from "../Icon.svelte";
  const dispatch = createEventDispatcher();
  export let menu: { group: string; items: IContextMenuItem[] }[];
  export let size: Size.sm | Size.md | Size.lg = Size.md;
  function isRedAccent(item: IContextMenuItem) {
    return item.value === "delete";
  }
</script>

<div
  class={cn("flex flex-col", {
    "w-32 text-b3": size === Size.sm,
    "w-40 py-2 text-b2": size === Size.md,
    "w-48 text-base": size === Size.lg
  })}
>
  {#each menu as group, index}
    <div class="flex flex-col">
      {#each group.items as item}
        <button
          class="flex p-1.5 px-4 items-center gap-2 hover:bg-bgs2"
          on:click={() => {
            if (item.callback) item.callback();
            dispatch("select", item.value);
          }}
        >
          {#if item.icon && typeof item.icon === "string"}
            <Icon
              size={Size.sm}
              icon={item.icon}
              class={cn({
                "stroke-ars1": isRedAccent(item)
              })}
            />
          {/if}
          <span
            class={cn({
              "text-ars1": isRedAccent(item)
            })}>{item.label ?? properCase(item.value.toString())}</span
          >
        </button>
      {/each}
    </div>
    {#if index !== menu.length - 1}
      <Divider />
    {/if}
  {/each}
</div>
