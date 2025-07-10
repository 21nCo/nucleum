<script lang="ts">
  import type { ITopNavBar } from "../landing.type";
  import NavMenuItem from "./NavMenuItem.svelte";
  import { popover } from "$lib/client/actions/popover.action";
  import NavBarExpandPopover from "./NavBarExpandPopover.svelte";
  import { landing } from "../store/shared.store";
  export let topNavBarValues: ITopNavBar;
  export let isStickedContext: boolean = false;
</script>

{#each topNavBarValues.items as item}
  {#if item.expandRender}
    <button
      data-popover-id="nav-menu-popover"
      use:popover={{
        content: NavBarExpandPopover,
        isRenderAsSibling: true,
        offsetInPx: 12,
        id: `nav-menu-popover-${item.label.toLowerCase().replace(/\s+/g, "-")}`,
        componentProps: {
          type: item.expandRender
        }
      }}
      class="flex items-center gap-1"
    >
      <NavMenuItem {item} {isStickedContext} />
    </button>
  {:else}
    <NavMenuItem
      {item}
      {isStickedContext}
      on:click={() => {
        if (item.callback) {
          item.callback();
        } else {
          landing.openLink(item.href);
        }
      }}
    />
  {/if}
{/each}
