<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import FormControlLabel from "$lib/tidy/elements/text/formLabel/FormControlLabel.svelte";
  import {
    DropDownStyle,
    type DropdownGroup,
    type DropdownItem
  } from "$lib/tidy/types/dropdownItem.type";
  import Icon from "../Icon.svelte";
  import { Size } from "$lib/tidy/types/size.enum";
  import appearance from "$lib/tidy/stores/appearance.store";
  import BackgroundElement from "../style/BackgroundElement.svelte";
  import Popover from "../popover/Popover.svelte";
  import FormLabelTooltip from "../text/formLabel/FormLabelTooltip.svelte";
  import TextInput from "../input/TextInput.svelte";
  import { isValidArrayWithData } from "$lib/tidy/utils/obj.utils";
  import type { PopoverOptions } from "$lib/tidy/types/popover.type";
  const dispatch = createEventDispatcher();
  export let items: DropdownItem[];
  export let groups: DropdownGroup[] = [];
  export let value: string | number;
  export let parentBackgroundIndex: number = 0;
  export let label: string | undefined = undefined;
  export let info: string | undefined = undefined;
  export let style: DropDownStyle = DropDownStyle.DEFAULT;
  export let isActive: boolean = false;
  let search: string = "";
  let searchInputRef: any;
  let popoverRef: any;
  let isShowOptions: boolean = false;
  let classList = "relative flex flex-col items-start gap-1 w-full";
  let popoverOptions: PopoverOptions = {
    element: "div",
    class:
      "max-h-80 overflow-y-auto flex flex-col gap-4 items-start search-results py-4",
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
  $: {
    if (isActive) {
      classList = "relative flex flex-col items-start gap-1 w-full";
      classList +=
        " bg-aps1" +
        (!$appearance.colorScheme.isActiveFgFg ? " text-bgs1" : "");
    } else classList = "relative flex flex-col items-start gap-1 w-full";
    classList = classList;
  }
  $: selected = items.find((x) => x.value === value) ?? items[0];
  // $: console.log("filtered", filtered);
  // $: if (search.length > 0) {
  //   filtered = groups.map((group) => {
  //     return {
  //       ...group,
  //       items: items.filter(
  //         (x) =>
  //           x.groupId === group.id &&
  //           x.label.toLowerCase().includes(search.toLowerCase())
  //       )
  //     };
  //   });
  // } else {
  //   filtered = groups;
  // }

  function resolveItems(groupId: string, search: string) {
    return items.filter(
      (x) =>
        x.groupId === groupId &&
        x.label.toLowerCase().includes(search.toLowerCase())
    );
  }
</script>

<Popover
  bind:this={popoverRef}
  on:show={() => {
    searchInputRef.focus();
  }}
  isPreventDefaultStyling={false}
  options={popoverOptions}
>
  <div class={classList} slot="trigger">
    {#if label}
      <FormControlLabel {label} info={{ body: info ?? "" }} />
    {/if}
    <button
      class="flex w-full justify-between gap-4 items-center p-2 {isShowOptions
        ? 'rounded-t-md'
        : 'rounded-md'} {style === DropDownStyle.OUTLINED
        ? 'border border-brs3'
        : style === DropDownStyle.PANEL_SWITCH
          ? 'text-h4 font-medium'
          : ''}"
    >
      <div class="flex gap-2">
        {#if selected.icon}
          <Icon icon={selected.icon} size={Size.sm} />
        {/if}
        {selected?.label}
      </div>
      <Icon icon={isShowOptions ? "chevup" : "chevdown"} size={Size.sm} />
    </button>
  </div>
  <svelte:fragment slot="popover">
    <div class="px-3 w-full">
      <TextInput
        bind:this={searchInputRef}
        bind:value={search}
        size={Size.sm}
        icon="search"
        placeholder="search"
      />
    </div>
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
        {#each resolveItems(group.id, search) as item, index}
          <button
            class="text-left px-3 py-2 hover:bg-bgs2 w-full {item.disabled
              ? 'text-fgs3'
              : 'text-fgs1'} {index === items.length - 1
              ? 'hover:rounded-b-md'
              : ''}"
            on:click={() => {
              if (item.disabled) return;
              value = item.value;
              isShowOptions = false;
              dispatch("select", item.value);
              popoverRef.hide();
            }}
          >
            <div class="flex gap-2">
              {#if item.icon}
                <Icon icon={item.icon} size={Size.sm} />
              {/if}
              {item.label}
            </div>
          </button>
        {/each}
      </div>
    {/each}
  </svelte:fragment>
</Popover>
