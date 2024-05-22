<script lang="ts">
  import type {
    Property,
    PropertyConfigOption
  } from "$lib/tidy/types/memotron/type.type";
  import { Orientation } from "$lib/tidy/types/direction.enum";
  import { InputStyle, type InputLabel } from "$lib/tidy/types/input.type";
  import { createEventDispatcher } from "svelte";
  import { Size } from "$lib/tidy/types/size.enum";
  import { isValidArrayWithData } from "$lib/tidy/utils/obj.utils";
  import type { PopoverOptions } from "$lib/tidy/types/popover.type";
  import Popover from "$lib/tidy/elements/popover/Popover.svelte";
  import InputBaseElement from "$lib/tidy/elements/InputBaseElement.svelte";
  import Icon from "$lib/tidy/elements/Icon.svelte";
  import TextInput from "$lib/tidy/elements/input/TextInput.svelte";
  import SelectPropertyItemList from "./SelectPropertyItemList.svelte";
  import SelectPropertyItem from "./SelectPropertyItem.svelte";
  import Button from "$lib/tidy/elements/button/Button.svelte";
  const dispatch = createEventDispatcher();
  export let property: Property;
  export let style: InputStyle = InputStyle.FILLED;
  export let label: InputLabel | undefined = undefined;
  export let value: string;
  export let parentBackgroundIndex: number = 0;
  let search: string = "";
  let searchInputRef: any;
  let popoverRef: any;
  let isOptionsVisible: boolean = false;
  let options: PropertyConfigOption[] = property.config?.options ?? [];
  let classList = "relative flex flex-col items-start gap-1 w-full";
  let popoverOptions: PopoverOptions = {
    element: "div",
    class:
      "max-h-80 overflow-y-auto flex flex-col gap-4 items-start search-results py-4",
    parentBgIndex: parentBackgroundIndex,
    isSpanToTriggerWidth: true
  };
  $: options =
    property.config?.options?.filter((x) =>
      x.label.toLowerCase().includes(search.toLowerCase())
    ) ?? [];

  function onselect(e: CustomEvent<string>) {
    value = e.detail;
    dispatch("change", value);
    popoverRef.hide();
  }
  function onenter() {
    //TODO: create new option if the text is not in the option list
  }
</script>

<Popover
  bind:this={popoverRef}
  on:show={() => {
    searchInputRef.focus();
  }}
  isPreventDefaultStyling={false}
  options={popoverOptions}
  triggerClass={classList}
  bind:isPopoverVisible={isOptionsVisible}
>
  <slot slot="trigger" name="trigger">
    <InputBaseElement
      class="justify-between gap-4"
      {style}
      {label}
      isActive={isOptionsVisible}
    >
      <SelectPropertyItem
        item={property.config?.options?.find((x) => x.id === value)}
        isSelectedContext={true}
      />
      <Icon icon={isOptionsVisible ? "chevup" : "chevdown"} size={Size.sm} />
    </InputBaseElement>
  </slot>
  <svelte:fragment slot="popover">
    <div class="flex gap-2 px-3 w-full text-b2">
      <TextInput
        bind:this={searchInputRef}
        bind:value={search}
        on:enter={onenter}
        icon="search"
        placeholder="Search or type to create new"
      />
      <!-- TODO - render config settings in popover -->
      <Button icon="settings" />
    </div>
    {#key search}
      {#if property.config?.groups && isValidArrayWithData(property.config?.groups)}
        {#each property.config?.groups as group}
          <SelectPropertyItemList
            groupId={group.id}
            groupLabel={group.label}
            {options}
            on:select={onselect}
          />
        {/each}
      {:else}
        <SelectPropertyItemList {options} on:select={onselect} />
      {/if}
    {/key}
  </svelte:fragment>
</Popover>
