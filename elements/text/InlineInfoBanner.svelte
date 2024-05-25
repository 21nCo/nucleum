<script lang="ts">
  import { renderMdAsHtml } from "$lib/tidy/components/markdown/markdown.utils";
  import { appStore } from "$lib/tidy/stores/app.store";
  import { InfoTextType } from "$lib/tidy/types/text.type";
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
  <Icon icon={type} />
  <div class="flex flex-col items-start gap-2">
    {#if content}
      <div class="text-left">
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
            if (action) appStore.runAction(action);
          }}
        />
      </div>
    {/if}
  </div>
</div>
