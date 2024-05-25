<script lang="ts">
  import { createEventDispatcher, onMount } from "svelte";
  import type {
    DropdownGroup,
    DropdownItem
  } from "$lib/client/types/dropdownItem.type";
  import Icon from "../Icon.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import FormLabelTooltip from "../text/formLabel/FormLabelTooltip.svelte";
  import TextInput from "../input/TextInput.svelte";
  import { isValidArrayWithData } from "$lib/client/utils/obj.utils";
  import type { PopoverOptions } from "$lib/client/types/popover.type";
  import { InputStyle, type InputLabel } from "$lib/client/types/input.type";
  import DropDownItemView from "./DropDownItemView.svelte";
  import InputBaseElement from "../InputBaseElement.svelte";
  import { cn } from "$lib/client/utils/ui.utils";
  import { Orientation } from "$lib/client/types/direction.enum";
  const dispatch = createEventDispatcher();
  /**
   * items to be displayed in the dropdown
   */
  export let items: DropdownItem[];
  export let groups: DropdownGroup[] = [];
  export let value: string | number;
  export let parentBackgroundIndex: number = 1;
  export let label: InputLabel | undefined = undefined;
  export let style: InputStyle = InputStyle.BORDERED;
  export let isDisableSearch: boolean = false;
  let isGrouped: boolean = groups.length > 0;
  let baseRef: any;
  let search: string = "";
  let searchInputRef: any;
  let isActive: boolean = false;
  let popoverOptions: PopoverOptions = {
    element: "div",
    class: "max-h-80 overflow-y-auto py-4",
    parentBgIndex: parentBackgroundIndex,
    isSpanToTriggerWidth: true
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
          x.label.toLowerCase().includes(search.toLowerCase())) ||
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
    if (item.disabled) return;
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
  bind:isActive
  bind:this={baseRef}
  {popoverOptions}
  class={cn("flex justify-between gap-4 items-center", {
    "w-full": !label?.label,
    "w-80":
      label?.label &&
      (label?.orientation === Orientation.Horizontal || !label?.orientation)
  })}
>
  <div class="flex items-center gap-2">
    {#if selected.icon}
      <Icon icon={selected.icon} size={Size.sm} />
    {/if}
    <span class="min-w-fit">
      {selected?.label}
    </span>
  </div>
  <Icon icon={isActive ? "chevup" : "chevdown"} size={Size.sm} />
  <div class="flex flex-col gap-2" slot="popover">
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
    {#each filtered as group}
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
