<script lang="ts">
  import { renderMdAsHtml } from "$lib/tidy/components/markdown/markdown.utils";
  import { Size } from "$lib/tidy/types/size.enum";
  import { InfoTextType } from "$lib/tidy/types/text.type";
  import { runAction } from "$lib/tidy/utils/utils";
  import Icon from "../Icon.svelte";
  import Link from "./Link.svelte";
  export let content: string | undefined = undefined;
  export let type: InfoTextType = InfoTextType.INFO;
  export let action: string | undefined = undefined;
</script>

<div
  class="flex rounded-md gap-4 p-4 text-b2 max-w-fit {type === InfoTextType.INFO
    ? 'bg-aps3'
    : type === InfoTextType.ERROR
      ? 'bg-ars2'
      : 'bg-ass3'}"
>
  <Icon icon={type} size={Size.sm} />
  <div class="flex flex-col items-start gap-2">
    {#if content}
      <div>
        {@html renderMdAsHtml(content)}
      </div>
    {:else}
      <slot />
    {/if}
    {#if action}
      <div class="text-b3">
        <Link
          label="Learn more"
          on:click={() => {
            if (action) runAction(action);
          }}
        />
      </div>
    {/if}
  </div>
</div>
