<script lang="ts">
  import { createEventDispatcher, onMount } from "svelte";
  import type {
    DropdownGroup,
    DropdownItem
  } from "@21n/types/dropdownItem.type";
  import Icon from "@21n/elements/Icon.svelte";
  import { Size } from "@21n/types/size.enum";
  import FormLabelTooltip from "@21n/elements/text/formLabel/FormLabelTooltip.svelte";
  import TextInput from "@21n/elements/input/TextInput.svelte";
  import { isValidArrayWithData } from "@21n/shared-utils/obj.utils";
  import type { IPopoverOptions } from "@21n/types/popover.type";
  import { InputStyle, type InputLabel } from "@21n/types/input.type";
  import DropDownItemView from "@21n/elements/dropdown/DropDownItemView.svelte";
  import InputBaseElement from "@21n/elements/InputBaseElement.svelte";
  import { cn } from "@21n/utils/ui.utils";
  import { Orientation, Placement } from "@21n/types/direction.enum";
  import { properCase } from "@21n/shared-utils/text.utils";
  import AvatarRenderer from "@21n/elements/avatarPicker/AvatarRenderer.svelte";
  const dispatch = createEventDispatcher();
  /**
   * items to be displayed in the dropdown
   */
  export let items: DropdownItem[];
  export let groups: DropdownGroup[] = [];
  export let value: string | number | boolean = items[0].value;
  export let parentBackgroundIndex: number = 1;
  export let label: InputLabel | undefined = undefined;
  export let style: InputStyle = InputStyle.BORDERED;
  export let isDisableSearch: boolean = false;
  export let size: Size.md | Size.sm = Size.md;
  export let width: string = "w-80";
  export let popoverWidth: string | undefined = undefined;
  export let isEnforceWidth: boolean = false;
  export let isShowDividerForGroup: boolean = false;
  let isGrouped: boolean = groups.length > 0;
  let baseRef: any;
  let search: string = "";
  let searchInputRef: any;
  let isActive: boolean = false;
  let popoverOptions: IPopoverOptions = {
    element: "div",
    class: "max-h-80 overflow-y-auto py-4",
    parentBgIndex: parentBackgroundIndex,
    isSpanToTriggerWidth: popoverWidth ? false : true,
    placement: Placement.BottomCenter
  };
  if (isGrouped) {
    items = items.map((x) => {
      x.groupId = x.groupId ?? "Nongroup";
      return x;
    });
  }
  groups = [
    ...groups,
    ...(groups.find((x) => x.id === "Nongroup")
      ? []
      : [{ id: "Nongroup", label: "Nongroup", order: -1 }])
  ];
  groups = groups.sort((a, b) => a.order - b.order);
  let filtered = groups;
  $: selected = items.find((x) => x.value === value) ?? items[0];
  function resolveItems(groupId: string, search: string) {
    return items.filter(
      (x) =>
        ((isGrouped && x.groupId === groupId) || !isGrouped) &&
        ((!isDisableSearch &&
          search &&
          x.label?.toLowerCase().includes(search.toLowerCase())) ||
          !search ||
          isDisableSearch)
    );
  }

  /**
   *
   *
   * TODO - Delay is added to hide popover - Without delay, this is interfering with selected label getting updated on the UI. Need to find a better way to handle this.
   *
   * @param e MouseEvent
   * @param item DropdownItem
   */
  function onitemclick(e: MouseEvent, item: DropdownItem) {
    if (item.isDisabled) return;
    value = item.value;
    dispatch("select", item.value);
    setTimeout(() => {
      if (baseRef) baseRef.hidePopover();
    }, 100);
  }
</script>

<InputBaseElement
  {style}
  {label}
  {size}
  bind:isActive
  bind:this={baseRef}
  {popoverOptions}
  class={cn("flex justify-between gap-4 items-center", {
    "w-full": !label?.label && style !== InputStyle.PLAIN && !isEnforceWidth,
    [width]:
      isEnforceWidth ||
      (label?.label &&
        (label?.orientation === Orientation.Horizontal ||
          !label?.orientation ||
          (label?.orientation === Orientation.Vertical && label?.isShrink)))
  })}
>
  <div class="flex items-center gap-2">
    {#if selected?.icon && typeof selected?.icon === "string"}
      <Icon icon={selected.icon} size={Size.sm} />
    {:else if selected?.icon && typeof selected?.icon === "object"}
      <AvatarRenderer avatar={selected.icon} size={Size.sm} />
    {/if}
    <span class="min-w-fit">
      {selected?.label ?? properCase(selected?.value.toString())}
    </span>
  </div>
  <Icon icon={isActive ? "chevron-up" : "chevron-down"} size={Size.sm} />
  <div class={cn("flex flex-col gap-2", popoverWidth)} slot="popover">
    {#if !isDisableSearch}
      <div class="px-3 w-full">
        <TextInput
          bind:this={searchInputRef}
          bind:value={search}
          size={Size.sm}
          icon="search"
          placeholder="search"
        />
      </div>
    {/if}
    {#each filtered as group, index}
      {#if isShowDividerForGroup && index > 0}
        <div class="w-full h-px bg-brs3" />
      {/if}
      <div class="flex flex-col w-full">
        {#if isGrouped && isValidArrayWithData(resolveItems(group.id, search))}
          <div class="flex gap-1 text-b3 text-fgs3 px-3 mb-1">
            {group.label === "Nongroup" ? "" : group.label}
            {#if group.info && group.info.body}
              <FormLabelTooltip info={group.info} />
            {/if}
          </div>
        {/if}
        {#each resolveItems(group.id, search) as item}
          <DropDownItemView {item} on:click={(e) => onitemclick(e, item)} />
        {/each}
      </div>
    {/each}
  </div>
</InputBaseElement>
