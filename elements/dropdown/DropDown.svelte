<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import type {
    DropdownGroup,
    DropdownItem
  } from "$lib/tidy/types/dropdownItem.type";
  import Icon from "../Icon.svelte";
  import { Size } from "$lib/tidy/types/size.enum";
  import FormLabelTooltip from "../text/formLabel/FormLabelTooltip.svelte";
  import TextInput from "../input/TextInput.svelte";
  import { isValidArrayWithData } from "$lib/tidy/utils/obj.utils";
  import type { PopoverOptions } from "$lib/tidy/types/popover.type";
  import { InputStyle, type InputLabel } from "$lib/tidy/types/input.type";
  import DropDownItemView from "./DropDownItemView.svelte";
  import InputBaseElement from "../InputBaseElement.svelte";
  import { cn } from "$lib/tidy/utils/ui.utils";
  import { Orientation } from "$lib/tidy/types/direction.enum";
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
  let search: string = "";
  let searchInputRef: any;
  let isActive: boolean = false;
  let popoverOptions: PopoverOptions = {
    element: "div",
    class: "max-h-80 overflow-y-auto py-4",
    parentBgIndex: parentBackgroundIndex,
    isSpanToTriggerWidth: true
  };
  items = items.map((x) => {
    x.groupId = x.groupId ?? "Nongroup";
    return x;
  });
  groups = [...groups, { id: "Nongroup", label: "Nongroup", order: -1 }];
  groups = groups.sort((a, b) => a.order - b.order);
  let filtered = groups;
  $: selected = items.find((x) => x.value === value) ?? items[0];
  function resolveItems(groupId: string, search: string) {
    return items.filter(
      (x) =>
        x.groupId === groupId &&
        x.label.toLowerCase().includes(search.toLowerCase())
    );
  }
</script>

<InputBaseElement
  {style}
  {label}
  bind:isActive
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
  <slot slot="popover" name="popover">
    <div class="flex flex-col gap-2">
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
          {#if isValidArrayWithData(resolveItems(group.id, search))}
            <div class="flex gap-1 text-b3 text-fgs3 px-3 mb-1">
              {group.label === "Nongroup" ? "" : group.label}
              {#if group.info && group.info.body}
                <FormLabelTooltip info={group.info} />
              {/if}
            </div>
          {/if}
          {#each resolveItems(group.id, search) as item}
            <DropDownItemView
              {item}
              on:click={() => {
                if (item.disabled) return;
                value = item.value;
                dispatch("select", item.value);
              }}
            />
          {/each}
        </div>
      {/each}
    </div>
  </slot>
</InputBaseElement>
