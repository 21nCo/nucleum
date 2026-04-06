<script lang="ts">
  import { cn } from "@21n/utils/ui.utils";
  import HoverableElement from "@21n/elements/HoverableElement.svelte";
  let {
    text = "",
    tooltip = undefined,
    delay = 1500,
    id = "",
    truncateLength = undefined,
    isHovering = $bindable(false),
    class: classList = ""
  }: {
    text?: string;
    tooltip?: string | undefined;
    delay?: number;
    id?: string;
    truncateLength?: number | undefined;
    isHovering?: boolean;
    class?: string;
  } = $props();
  let textRef: any;
</script>

<HoverableElement
  {id}
  bind:this={textRef}
  bind:isHovering
  class={cn(classList, "relative")}
  tooltip={tooltip ?? text}
  tooltipOptions={{
    delay
  }}
>
  {truncateLength != undefined
    ? text.slice(0, truncateLength) +
      (text.length > truncateLength ? "..." : "")
    : text}
</HoverableElement>
