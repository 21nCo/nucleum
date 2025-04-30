<script lang="ts">
  import type { ITopNavBar } from "../landing.type";
  import NavMenuItem from "./NavMenuItem.svelte";
  import { popover } from "$lib/client/actions/popover.action";
  import NavBarExpandPopover from "./NavBarExpandPopover.svelte";
  import { landing } from "../store/shared.store";
  export let topNavBarValues: ITopNavBar;
</script>

{#each topNavBarValues.items as item}
  {#if item.expandRender}
    <button
      data-popover-id="nav-menu-popover"
      use:popover={{
        content: NavBarExpandPopover,
        isRenderAsSibling: true,
        offsetInPx: 12,
        componentProps: {
          type: item.expandRender
        }
      }}
      class="flex items-center gap-1"
    >
      <NavMenuItem {item} />
    </button>
  {:else}
    <NavMenuItem {item} on:click={() => landing.openLink(item.href)} />
  {/if}
{/each}
