<script lang="ts">
  import type { ITopNavBar } from "@21n/landing/shared/landing.type";
  import NavMenuItem from "@21n/landing/shared/navbar/NavMenuItem.svelte";
  import { popover } from "@21n/actions/popover.action";
  import NavBarExpandPopover from "@21n/landing/shared/navbar/NavBarExpandPopover.svelte";

  let {
    topNavBarValues,
    isStickedContext = false,
  }: {
    topNavBarValues: ITopNavBar;
    isStickedContext?: boolean;
  } = $props();

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
    <NavMenuItem {item} {isStickedContext} />
  {/if}
{/each}
