<script lang="ts">
  import { InputStyle, type InputLabel } from "$lib/client/types/input.type";
  import { createEventDispatcher } from "svelte";
  import { Size } from "$lib/client/types/size.enum";
  import { deepCopy, isValidArrayWithData } from "$lib/shared/utils/obj.utils";
  import type { IPopoverOptions } from "$lib/client/types/popover.type";
  import Popover from "$lib/client/elements/popover/Popover.svelte";
  import InputBaseElement from "$lib/client/elements/InputBaseElement.svelte";
  import Icon from "$lib/client/elements/Icon.svelte";
  import TextInput from "$lib/client/elements/input/TextInput.svelte";
  import SelectPropertyItemList from "./SelectPropertyItemList.svelte";
  import SelectPropertyItem from "./SelectPropertyItem.svelte";
  import Button from "$lib/client/elements/button/Button.svelte";
  import type {
    IProperty,
    PropertyConfig,
    PropertyConfigOption
  } from "./property.type";
  import SelectOptionsEditor from "./propertyConfig/selectProperty/SelectOptionsEditor.svelte";
  import { ButtonStyle, ButtonVariant } from "$lib/client/types/button.type";
  import { logger } from "$lib/client/components/debug/logger.client";
  const dispatch = createEventDispatcher();
  export let property: IProperty;
  export let style: InputStyle = InputStyle.FILLED;
  export let label: InputLabel | undefined = undefined;
  export let value: string;
  export let parentBackgroundIndex: number = 0;
  export let dev_isHideEditOptions: boolean = false;
  let search: string = "";
  let searchInputRef: any;
  let popoverRef: any;
  let isOptionsVisible: boolean = false;
  let originalConfig: PropertyConfig | undefined;
  let options: PropertyConfigOption[] = property.config?.options ?? [];
  let classList = "relative flex flex-col items-start gap-1 w-full";
  let isEditing: boolean = false;
  let popoverOptions: IPopoverOptions = {
    element: "div",
    class: "max-h-96 h-96",
    parentBgIndex: parentBackgroundIndex,
    isSpanToTriggerWidth: true,
    isUseAbsolutePositioning: true
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
  function onenter(e: any) {
    if (options.length === 0 && e.detail) {
      dispatch("newOption", {
        id: property.id,
        label: e.detail.value
      });
      search = "";
      popoverRef?.hide();
    }
  }
  function onSave() {
    propagateConfigChange();
    isEditing = false;
  }
  function onReorderOptions(
    e: CustomEvent<{ from: number; to: number; listId: string }>
  ) {
    const { from, to, listId } = e.detail;
    if (!listId || listId !== "options") return;
    const [movedItem] = property.config?.options?.splice(from, 1) ?? [];
    property.config?.options?.splice(to, 0, movedItem);
    property.config = property.config;
  }

  function propagateConfigChange() {
    logger.log({
      at: "propagateConfigChange",
      config: property.config
    });
    dispatch("configChange", {
      id: property.id,
      config: property.config
    });
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
  <div class="flex flex-col h-full w-full" slot="popover">
    {#if isEditing && property.config}
      <div class="flex w-full flex-grow">
        <SelectOptionsEditor
          bind:config={property.config}
          on:reorder={onReorderOptions}
        />
      </div>
    {:else}
      <div class="flex gap-2 px-3 w-full text-b2 py-2">
        <TextInput
          bind:this={searchInputRef}
          bind:value={search}
          on:enter={onenter}
          icon="ph:magnifying-glass"
          placeholder="Search or type to create new"
        />
        <!-- TODO - render config settings in popover -->
      </div>
      <div class="flex w-full flex-grow styledscroll">
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
          {#if search && !options.length}
            <div class="text-b2 text-fgs3 px-3 py-2">
              No results found. Press Enter to create new
            </div>
          {/if}
        {/key}
      </div>
    {/if}
    <button
      class="flex justify-center items-center h-12 min-h-12 bg--bgs2 w-full"
      on:click={(e) => {
        e.stopPropagation();
      }}
    >
      {#if isEditing}
        <div class="flex gap-3 items-center justify-between w-full px-4">
          <Button
            label="Cancel"
            icon="ph:x"
            style={ButtonStyle.PLAIN}
            size={Size.xs}
            on:click={() => {
              property.config = originalConfig;
              isEditing = false;
            }}
          />
          <Button
            label="Save"
            icon="ph:check"
            type={ButtonVariant.PRIMARY}
            style={ButtonStyle.DEFAULT}
            size={Size.xs}
            on:click={onSave}
          />
        </div>
      {:else if !dev_isHideEditOptions}
        <Button
          label="Edit options"
          isUnderlined={true}
          style={ButtonStyle.PLAIN}
          size={Size.xs}
          on:click={() => {
            originalConfig = deepCopy(property.config);
            isEditing = true;
          }}
        />
      {/if}
    </button>
  </div>
</Popover>
