<script lang="ts">
  import { fileLoaderv2 } from "$lib/client/actions/lazyload.action";
  import Icon from "$lib/client/elements/Icon.svelte";
  import { cn } from "$lib/client/utils/ui.utils";
  export let src: string;
</script>

<div
  class="absolute inset-0 w-full h-full flex justify-center items-center rounded-t-md"
>
  <img
    use:fileLoaderv2={{
      source: src,
      isApplyBgColorFromImage: true,
      isApplyBgColorToParent: true
    }}
    class="w-12 h-12 rounded-full"
    alt="..."
    on:load
    on:error={(e) => {
      e.currentTarget.style.display = "none";
      e.currentTarget?.nextElementSibling?.classList?.remove("hidden");
    }}
  />
  <div class={cn("hidden w-full h-full flex items-center justify-center", {})}>
    <Icon icon="ph:x-logo" />
  </div>
</div>
