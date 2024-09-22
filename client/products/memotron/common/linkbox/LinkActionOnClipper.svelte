<script lang="ts">
  import { abg, cn } from "$lib/client/utils/ui.utils";
  import Icon from "$lib/client/elements/Icon.svelte";
  export let links: string[];
  export let isLinkboxOpened: boolean = false;
</script>

<button
  class={cn(
    "flex gap-1 items-center justify-center px-2 py-0.5 rounded-md text-b3",
    abg(isLinkboxOpened),
    {
      "bg-bgs2 border border-transparent hover:border-brs2": !isLinkboxOpened
    }
  )}
  on:click|stopPropagation={() => {
    isLinkboxOpened = !isLinkboxOpened;
  }}
>
  <Icon
    icon={isLinkboxOpened ? "link-arrow-down" : "link-arrow-left"}
    isAccentBgContext={isLinkboxOpened}
  />
  <span> Link </span>
  {#if links?.length > 0}
    <span
      class={cn(
        "flex items-center justify-center text-fgs2 text-b4 rounded-full h-4 w-4",
        {
          "bg-bgs3": !isLinkboxOpened,
          "bg-aps2": isLinkboxOpened
        }
      )}
    >
      {links.length}
    </span>
  {/if}
</button>
