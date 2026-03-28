<script lang="ts">
  import Icon from "@21n/elements/Icon.svelte";
  import { cn } from "@21n/utils/ui.utils";
  import { Size } from "@21n/types/size.enum";
  import view from "@21n/stores/view.store";
  export let text: string = "Add new";
  export let size: Size.xs | Size.sm | Size.md | Size.lg = Size.md;
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
