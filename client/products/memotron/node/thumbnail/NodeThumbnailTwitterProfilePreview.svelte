<script lang="ts">
  import { lazyLoad } from "$lib/client/actions/lazyload.action";
  import Icon from "$lib/client/elements/Icon.svelte";
  import { cn, getImageColors } from "$lib/client/utils/ui.utils";
  import { createEventDispatcher } from "svelte";
  const dispatch = createEventDispatcher();
  export let src: string;
  let dominantColor: string;

  async function handleImageLoad(e: Event) {
    try {
      const img = e.target as HTMLImageElement;
      const colors = await getImageColors(img);
      dominantColor = colors[0];
    } catch (error) {
      console.warn("Error analyzing image:", error);
    } finally {
      dispatch("load");
    }
  }
</script>

<div
  class="absolute inset-0 w-full h-full flex justify-center items-center rounded-t-md"
  style={`background-color: ${dominantColor}`}
>
  <img
    use:lazyLoad={src}
    class="w-12 h-12 rounded-full"
    alt="..."
    on:load={handleImageLoad}
    on:error={(e) => {
      e.currentTarget.style.display = "none";
      e.currentTarget?.nextElementSibling?.classList?.remove("hidden");
    }}
  />
  <div class={cn("hidden w-full h-full flex items-center justify-center", {})}>
    <Icon icon="ph:x-logo" />
  </div>
</div>
