<script lang="ts">
  import Icon from "@21n/ui/elements/Icon.svelte";
  import { Size } from "@21n/ui/elements/size.enum";
  import { toExternalHttpUrl } from "@21n/shared-utils/url.utils";
  import { internalUrlNodeTypeList, type INode } from "@nucleum/features/memory/node/node.type";
  let { item }: { item: INode } = $props();
  /**
   * Only http(s) URLs become links: a shared node's URL is record data that
   * another user can set to any scheme, such as `javascript:`.
   */
  const href = $derived(
    internalUrlNodeTypeList.includes(item.contentType)
      ? undefined
      : toExternalHttpUrl(item.url)
  );
  const domain = $derived(href ? new URL(href).hostname : "");
</script>

{#if href}
  <button
    class="flex gap-0.5 items-center underline text-fgs3 text-b4"
    onclick={(event) => event.stopPropagation()}
  >
    <Icon icon="link-mini" size={Size.sm} />
    <a {href} target="_blank" rel="noopener noreferrer">
      {domain}
    </a>
  </button>
{/if}
