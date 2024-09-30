<script lang="ts">
  import { Size } from "$lib/client/types/size.enum";
  import { cn } from "$lib/client/utils/ui.utils";
  import Toggle from "./Toggle.svelte";
  import { createEventDispatcher } from "svelte";
  import type { IToggleItem } from "./toggle.type";
  import { enumToString } from "$lib/shared/utils/text.utils";
  const dispatch = createEventDispatcher();

  export let items: IToggleItem[] = [];
  export let size: Size.sm | Size.md | Size.lg = Size.md;
  export let parentBgIndex: number = 1;
  export let selected: string = "";
  let classList: string = "";
  export { classList as class };
</script>

<div class={cn("flex items-center justify-center w-full h-full", classList)}>
  {#each items as item}
    <Toggle
      icon={item.icon}
      {size}
      {parentBgIndex}
      on={selected === item.value}
      tooltip={item.tooltip ?? enumToString(item.value)}
      on:change={(e) => {
        if (e.detail === false) {
          dispatch("none", item.value);
          return;
        }
        selected = item.value;
        dispatch("change", item.value);
      }}
    />
  {/each}
</div>
