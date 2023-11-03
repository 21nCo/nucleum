<script lang="ts">
  import type { GoalContextMenuItem } from "$lib/local/types/goalContextMenuItem.type";
  import { SvelteComponent, createEventDispatcher, onMount } from "svelte";
  import ContextMenuItem from "./ContextMenuItem.svelte";
  import type { ClassListProp } from "$lib/tidy/types/classListProp.type";
  import { actIfClickedOutside, generateUID } from "$lib/tidy/utils/utils";
  import { appEvents } from "$lib/tidy/stores/app.store";
  import type { AppEventType } from "$lib/tidy/types/event.type";
  import { AppEvent } from "$lib/tidy/types/event.enum";
  import { Placement } from "$lib/tidy/types/placement.type";
  import Icon from "../Icon.svelte";
  import ThreeVerticalDots from "$lib/tidy/icons/ThreeVerticalDots.svelte";

  export let icon: string = "";

  export let items: GoalContextMenuItem[] = [];
  export let hideIcon: boolean = false;
  export let isContextMenuOpen: boolean = false;

  export let menuContainerClassList: string = "";
  export let menuItemClassList: ClassListProp | null = null;
  export let iconClassList: string = "";

  export let menuContainerStyle: string = "";
  export let menuItemStyle = "";
  export let iconStyle: string = "";

  export let placement: Placement = Placement.RIGHT;

  let selectedIndex: number = 0;
  const id = generateUID();

  const dispatch = createEventDispatcher();

  let iconComponent: typeof SvelteComponent | undefined;

  function handleIconClick() {
    dispatch("icon-click");
  }

  function setToDefaultValue() {
    selectedIndex = -1;
  }

  function handleMenuItemClick(item: GoalContextMenuItem) {
    return () => {
      dispatch("menu-item-click", item);
      setToDefaultValue();
    };
  }
  function closeContextMenu() {
    setToDefaultValue();
    dispatch("close");
  }

  function handleKeyDownInList(event: KeyboardEvent) {
    if (!isContextMenuOpen) handleIconClick();
    else if (event.key === "Enter") {
      handleMenuItemClick(items[selectedIndex])();
    } else if (event.key === "ArrowDown") {
      selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
    } else if (event.key === "ArrowUp") {
      selectedIndex = Math.max(selectedIndex - 1, -1);
    } else if (event.key === "Escape") {
      closeContextMenu();
    }
  }

  appEvents.subscribe((x: AppEventType) => {
    if (
      x.event === AppEvent.WINDOW_CLICKED &&
      x.value &&
      x.value instanceof PointerEvent
    ) {
      actIfClickedOutside(x.value, `.task-text-${id}`, closeContextMenu);
    }
  });
</script>

<!-- svelte-ignore a11y-no-noninteractive-tabindex -->
<div
  {id}
  class="z-20 relative"
  on:keydown|stopPropagation={handleKeyDownInList}
>
  {#if icon && !hideIcon}
    <div
      style={iconStyle}
      tabindex="0"
      class={`flex justify-center cursor-pointer items-center w-4 h-4 ${iconClassList}`}
      on:click|stopPropagation={handleIconClick}
      on:keydown|stopPropagation={handleKeyDownInList}
    >
      <!-- <Icon {icon} /> -->
      <ThreeVerticalDots />
    </div>
  {/if}
  {#if isContextMenuOpen}
    <div
      style={menuContainerStyle}
      class={`absolute top-0 ${
        placement === Placement.RIGHT ? `left-10` : `right-10`
      } bg-bgs4 ${menuContainerClassList}`}
    >
      {#each items as item, index}
        <ContextMenuItem
          label={item.label}
          icon={item.icon}
          isActive={selectedIndex === index}
          on:click={handleMenuItemClick(item)}
          style={menuItemStyle}
          classList={menuItemClassList}
        />
      {/each}
    </div>
  {/if}
</div>
