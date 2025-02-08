<script lang="ts">
  import Icon from "$lib/client/elements/Icon.svelte";
  import { renderMdAsHtml } from "../../markdown/markdown.utils";
  export let features: string[] = [];
  export let moreLink: string | undefined = undefined;
</script>

<ul class="space-y-3">
  {#each features as feature}
    <li class="flex items-center gap-2 text-sm text-fgs2">
      <Icon icon="ph:check-circle-fill" class="text-aps1 shrink-0" />
      {@html renderMdAsHtml(feature)}
    </li>
  {/each}
  {#if moreLink}
    <li class="flex items-center gap-2 text-sm text-fgs2 py-3">
      <Icon icon="ph:arrow-right-light" class="text-aps1 shrink-0" />
      <a href={moreLink} class="text-aps1">Learn more</a>
    </li>
  {/if}
</ul>
