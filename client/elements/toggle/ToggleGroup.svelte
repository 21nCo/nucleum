<script lang="ts">
  import { Size } from "@21n/types/size.enum";
  import { cn } from "@21n/utils/ui.utils";
  import Toggle from "@21n/elements/toggle/Toggle.svelte";
  import { createEventDispatcher } from "svelte";
  import type { IToggleItem } from "@21n/elements/toggle/toggle.type";
  import { enumToString } from "@21n/shared-utils/text.utils";
  const dispatch = createEventDispatcher();

  export let items: IToggleItem[] = [];
  export let size: Size.sm | Size.md | Size.lg = Size.md;
  export let bgSize: Size.sm | Size.md | Size.lg = Size.md;
  export let parentBgIndex: number = 1;
  export let selected: string | undefined = undefined;
  let classList: string = "";
  export { classList as class };

  export function reset() {
    selected = undefined;
  }
</script>

<div class={cn("flex items-center justify-center w-full h-full", classList)}>
  {#each items as item}
    <Toggle
      icon={item.icon}
      {size}
      {bgSize}
      {parentBgIndex}
      count={item.count}
      on={selected === item.value}
      tooltip={item.tooltip ?? enumToString(item.value)}
      on:change={(e) => {
        if (e.detail === false) {
          dispatch("none", item.value);
          selected = undefined;
          return;
        }
        selected = item.value;
        dispatch("change", item.value);
      }}
    />
  {/each}
</div>
