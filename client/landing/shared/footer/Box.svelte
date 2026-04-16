<script lang="ts">
  import type { Snippet } from "svelte";
  import { cn } from "@21n/utils/ui.utils";
  let {
    backgroundImage = "",
    expansion = undefined,
    children
  }: {
    backgroundImage?: string;
    expansion?: "horizontal" | "vertical" | undefined;
    children?: Snippet;
  } = $props();

</script>

<div
  class={cn(
    "relative flex flex-col rounded-xl p-6 bg-bgs1 gap-6 grow",
    backgroundImage ? "bg-cover" : "",
    {
      "h-[196px] min-h-[180px]": expansion !== "vertical",
      "min-w-[330px]": expansion !== "horizontal"
    }
  )}
  style="background-image: url('{backgroundImage}');background-size:cover;"
>
  {#if backgroundImage}
    <div class="absolute inset-0 bg-fgs1 opacity-40 rounded-[20px]"></div>
  {/if}
  {@render children?.()}
</div>
