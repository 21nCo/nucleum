<script lang="ts">
  import { imageRepositioner } from "@21n/actions/imageRepositioning.action";
  import {
    FileType,
    type IImageRepositionerOptions
  } from "@21n/components/files/file.type";
  import FileView from "@21n/components/files/FileView.svelte";
  import { cn } from "@21n/utils/ui.utils";
  import { gradientsList } from "@21n/elements/colorPicker/gradients/gradients";
  import { debouncer } from "@21n/utils/utils";
  import { createEventDispatcher } from "svelte";
  const dispatch = createEventDispatcher();
  export let cover: string;
  let classList: string = "";
  export { classList as class };
  export let repositionParams: IImageRepositionerOptions | undefined =
    undefined;
  export let isLazyLoad: boolean = false;

  function handlePositionChange(newPosition: number) {
    dispatch("reposition", newPosition);
    debouncedRepositionPropagation(newPosition);
  }
  const debouncedRepositionPropagation = debouncer((newPosition: number) => {
    dispatch("repositionDebounced", newPosition);
  }, 1000);
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
{:else if typeof cover === "string" && cover.includes("unsplash_")}
  <img
    src={cover.split("unsplash_")[1]}
    alt="Unsplash cover"
    draggable={false}
    class={cn("h-full w-full object-cover", classList)}
    use:imageRepositioner={{
      onPositionChange: handlePositionChange,
      ...(repositionParams ?? {
        enabled: false
      })
    }}
  />
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
