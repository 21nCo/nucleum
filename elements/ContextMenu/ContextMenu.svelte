<script lang="ts">
  import type { GoalContextMenuItem } from "$lib/local/types/goalContextMenuItem.type";
  import { SvelteComponent, createEventDispatcher, onMount } from "svelte";
  import ContextMenuItem from "./ContextMenuItem.svelte";
  import type { ClassListProp } from "$lib/tidy/types/classListProp.type";
  import { generateUID } from "$lib/tidy/utils/utils";
  import { pointronEvents } from "$lib/local/stores/local.store";
  import type { PointronEvent } from "$lib/local/types/pointronEvent.type";
  import { PointronEventEnum } from "$lib/local/types/pointronEvent.enum";
  import { actIfClickedOutside } from "$lib/local/utils/local.utils";

  export let icon: string = "";
  export let customIconPath: string | undefined = "";

  export let items: GoalContextMenuItem[] = [];
  export let hideIcon: boolean = false;
  export let isContextMenuOpen: boolean = false;

  export let menuContainerClassList: string = "";
  export let menuItemClassList: ClassListProp | null = null;
  export let iconClassList: string = "";

  export let menuContainerStyle: string = "";
  export let menuItemStyle = "";
  export let iconStyle: string = "";

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
    dispatch("close-context-menu");
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

  onMount(async () => {
    // if icon is present then dynamically import it from the tidy icon folder or from the customIconPath
    try {
      if (icon) {
        const { default: Icon } = await import(
          `${
            customIconPath
              ? `../../../${customIconPath}`
              : `../../../tidy/icons`
          }/${icon}.svelte`
        );
        iconComponent = Icon;
      }
    } catch (err) {
      console.log(err);
    }
  });
  pointronEvents.subscribe((x: PointronEvent) => {
    if (
      x.event === PointronEventEnum.WINDOW_CLICKED &&
      x.value &&
      x.value instanceof PointerEvent
    ) {
      actIfClickedOutside(x.value, `.task-text-${id}`, closeContextMenu);
    }
  });
</script>

<!-- svelte-ignore a11y-no-noninteractive-tabindex -->
<div {id} class="relative" on:keydown|stopPropagation={handleKeyDownInList}>
  {#if icon && iconComponent && !hideIcon}
    <div
      style={iconStyle}
      tabindex="0"
      class={`flex justify-center items-center w-4 h-4 ${iconClassList}`}
      on:click|stopPropagation={handleIconClick}
      on:keydown|stopPropagation={handleKeyDownInList}
      on:focusout={closeContextMenu}
    >
      <svelte:component this={iconComponent} />
    </div>
  {/if}
  {#if isContextMenuOpen}
    <div
      style={menuContainerStyle}
      class={`absolute top-0 left-10 bg-bgs4 ${menuContainerClassList}`}
    >
      {#each items as menuItem, index}
        <ContextMenuItem
          label={menuItem.label}
          icon={menuItem.icon}
          isActive={selectedIndex === index}
          on:click={handleMenuItemClick(menuItem)}
          style={menuItemStyle}
          classList={menuItemClassList}
        />
      {/each}
    </div>
  {/if}
</div>
