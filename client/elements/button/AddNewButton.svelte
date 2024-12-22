<script lang="ts">
  import Icon from "../Icon.svelte";
  import { cn } from "$lib/client/utils/ui.utils";
  import { Size } from "$lib/client/types/size.enum";
  import view from "$lib/client/stores/view.store";
  export let text: string = "Add new";
  export let size = Size.md;
  export let className: string = "";
  export { className as class };
  let addText: string = $view.isConstrainedWidth ? "" : text;
  let isHoveringOnAddNewItem = false;
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
