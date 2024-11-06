<script lang="ts">
  import { hoverable } from "$lib/client/actions/hover.action";
  import CustomColorPropagator from "$lib/client/elements/style/CustomColorPropagator.svelte";
  import type { ISelectValue } from "$lib/client/types/select.type";
  import { cn } from "$lib/client/utils/ui.utils";
  import type { IViewTab } from "./viewTab.type";
  import { createEventDispatcher } from "svelte";
  const dispatch = createEventDispatcher();

  export let tabs: IViewTab[];
  export let selected: ISelectValue | undefined = undefined;
  export let hoveredItem: ISelectValue | undefined = undefined;
  if (!selected) selected = tabs[0].value;
</script>

<div class="flex flex-1 min-w-0 mo:w-full mo:pb-1 overflow-x-auto gap-3">
  {#each tabs as option (option.value)}
    <CustomColorPropagator color={option.color} class="flex whitespace-nowrap">
      <button
        class={cn(
          "flex gap-2 items-center justify-center border rounded-md px-3 py-1 min-w-16 text-b2",
          !option.color && {
            "border-brs3 hover:bg-bgs2": selected !== option.value,
            "border-aps1 bg-aps1 text-abg": selected === option.value
          },
          option.color && {
            "border-ccs1 bg-ccs1 text-abg": selected === option.value,
            "border-ccs2 bg-ccs3":
              selected !== option.value && hoveredItem === option.value,
            "border-ccs2 bg-ccs5":
              selected !== option.value && hoveredItem !== option.value
          }
        )}
        use:hoverable
        on:hover={(e) => {
          if (e.detail) {
            hoveredItem = option.value;
          } else {
            hoveredItem = undefined;
          }
        }}
        on:click={() => {
          selected = option.value;
          dispatch("select", option.value);
        }}
      >
        {option.label}
      </button>
    </CustomColorPropagator>
  {/each}
</div>
