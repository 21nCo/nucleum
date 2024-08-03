<script lang="ts">
  import Icon from "../Icon.svelte";
  import { cn } from "$lib/client/utils/ui.utils";
  import { Size } from "$lib/client/types/size.enum";
  let isHoveringOnAddNewItem = false;
  export let size = Size.md;
  export let addText: string = "Add new";
  export let className: string = "";
  export { className as class };
</script>

<button
  on:click
  class={cn("flex items-center hover:text-aps1 gap-1", className)}
  on:mouseenter={() => (isHoveringOnAddNewItem = true)}
  on:mouseleave={() => (isHoveringOnAddNewItem = false)}
>
  <Icon
    icon="plus"
    {size}
    class={cn({
      "stroke-aps1": isHoveringOnAddNewItem
    })}
  />
  <span class="min-w-fit whitespace-nowrap">
    {addText}
  </span>
</button>
