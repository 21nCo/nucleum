<script lang="ts">
  import { cn } from "$lib/client/utils/ui.utils";
  import HoverableElement from "../HoverableElement.svelte";
  export let text: string = "";
  export let tooltip: string | undefined = undefined;
  export let delay: number = 1500;
  export let id: string = "";
  export let truncateLength: number | undefined = undefined;
  let textRef: any;
  let classList: string = "";
  /**
   * @readonly
   */
  export let isHovering: boolean = false;
  export { classList as class };
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
