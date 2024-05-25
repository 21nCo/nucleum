<script lang="ts">
  import { renderMdAsHtml } from "$lib/client/components/markdown/markdown.utils";
  import type { FormLabelInfoTooltip } from "$lib/client/types/text.type";
  export let tooltip: string | undefined = undefined;
  export let info: FormLabelInfoTooltip | undefined = undefined;
  export let variant: "v1" | "v2" = "v1";
</script>

{#if variant === "v1" && info}
  <div
    class="text-left text-b2 text-fgs2 bg-bgs2 shadow-md rounded-md p-4 min-w-[15rem] max-w-sm"
  >
    <div class="flex flex-col gap-2">
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
  <div class="min-w-fit bg-fgs3 text-bgs1 text-b3 rounded-md z-30 px-4">
    {tooltip ?? info?.body}
  </div>
{/if}
