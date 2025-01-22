<script lang="ts">
  import {
    FileType,
    type IImageRepositionerOptions
  } from "$lib/client/components/files/file.type";
  import FileView from "$lib/client/components/files/FileView.svelte";
  import { cn } from "$lib/client/utils/ui.utils";
  import { gradientsList } from "../colorPicker/gradients/gradients";
  export let cover: string;
  let classList: string = "";
  export { classList as class };
  export let repositionParams: IImageRepositionerOptions = {};
  export let isLazyLoad: boolean = false;
</script>

{#if typeof cover === "string" && cover.includes("hex_")}
  <div
    class={cn("w-full h-full", classList)}
    style="background-color: {cover.replace('hex_', '')};"
  ></div>
{:else if typeof cover === "string" && cover.includes("gradient_")}
  <div
    class={cn(
      "w-full h-full",
      classList,
      gradientsList.find(
        (gradient) => gradient.id == cover.replace("gradient_", "")
      )?.gradient
    )}
  ></div>
{:else}
  <FileView
    id={cover}
    {repositionParams}
    {isLazyLoad}
    type={FileType.IMAGE}
    class={cn("h-full w-full object-cover", classList)}
    on:reposition
    on:repositionDebounced
  />
{/if}
