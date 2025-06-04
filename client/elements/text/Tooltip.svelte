<script lang="ts">
  import { renderMdAsHtml } from "$lib/client/components/markdown/markdown.utils";
  import view from "$lib/client/stores/view.store";
  import { Size } from "$lib/client/types/size.enum";
  import type { FormLabelInfoTooltip } from "$lib/client/types/text.type";
  import { cn } from "$lib/client/utils/ui.utils";
  import Button from "../button/Button.svelte";
  import Icon from "../Icon.svelte";
  export let tooltip: string | undefined = undefined;
  export let info: FormLabelInfoTooltip | undefined = undefined;
  export let variant: "v1" | "v2" = "v1";
  export let onClose: () => void = () => {};
</script>

{#if variant === "v1" && info}
  <div
    class={cn("text-left text-b2 rounded-md p-4 text-wrap", {
      "h-48 text-fgs2": $view.isConstrainedWidth,
      "bg-fgs2 text-bgs1 shadow-md min-w-[25rem] max-w-sm":
        !$view.isConstrainedWidth
    })}
  >
    <div class="flex flex-col gap-2">
      {#if $view.isConstrainedWidth}
        <div class="flex justify-between items-center">
          <div class="flex items-center gap-1 text-fgs3">
            <Icon icon="ph:info" size={Size.sm} class="text-fgs3" />
            <span class="text-b2 font-medium"> Information </span>
          </div>
          <Button icon="ph:x" size={Size.sm} on:click={onClose} />
        </div>
      {/if}
      <div>
        {@html renderMdAsHtml(info.body)}
      </div>
      {#if info.link}
        <a
          class="text-b4 font-medium text-aps1 hover:opacity-80"
          href={info.link}
          target="_blank"
          rel="noopener noreferrer"
        >
          {info.linkText ?? "Learn more"}
        </a>
      {/if}
    </div>
  </div>
{:else}
  <div
    class={cn("min-w-fit whitespace-nowrap text-b3 rounded-md z-30 px-4 py-1", {
      "bg-bgs2 text-fgs2": $view.isConstrainedWidth,
      "bg-fgs2 text-bgs1": !$view.isConstrainedWidth
    })}
  >
    {tooltip ?? info?.body}
  </div>
{/if}
