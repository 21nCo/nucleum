<script lang="ts">
  import Icon from "$lib/client/elements/Icon.svelte";
  import { LinkType } from "$lib/client/products/memotron/linking/link.type";
  import { cn } from "$lib/client/utils/ui.utils";
  import { Size } from "$lib/client/types/size.enum";
  import { tooltip } from "$lib/client/actions/popover.action";
  import { resolveLinkTypeConfig } from "$lib/client/products/memotron/linking/link.utils";

  export let linkType: LinkType;
  export let direction: "incoming" | "outgoing" | undefined = undefined;

  $: linkConfig = resolveLinkTypeConfig(linkType, direction);
</script>

<button
  class={cn(
    "flex items-center justify-center gap-1 h-6 w-6 rounded-md border border-brs3 text-b4 font-medium hover:bg-bgs2"
  )}
  use:tooltip={{
    text: linkConfig.label
  }}
  on:click
>
  <Icon icon={linkConfig.icon} size={Size.sm} />
</button>
