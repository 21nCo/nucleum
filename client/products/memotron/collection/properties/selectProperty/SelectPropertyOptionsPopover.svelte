<script lang="ts">
  import { Size } from "$lib/client/types/size.enum";
  import { deepCopy, isValidArrayWithData } from "$lib/shared/utils/obj.utils";
  import TextInput from "$lib/client/elements/input/TextInput.svelte";
  import Button from "$lib/client/elements/button/Button.svelte";
  import {
    PropertyType,
    type ISelectProperty,
    type ISelectPropertyConfig,
    type IPropertyConfigOption
  } from "../property.type";
  import SelectOptionsEditor from "../propertyConfig/selectProperty/SelectOptionsEditor.svelte";
  import { ButtonStyle, ButtonVariant } from "$lib/client/types/button.type";
  import { logger } from "$lib/client/components/debug/logger.client";
  import SelectPropertyOptionList from "./SelectPropertyOptionList.svelte";
  import type { IRecordId } from "$lib/client/types/data.type";
  export let property: ISelectProperty;
  export let value: string | string[];
  export let onSelect: (value: string | string[]) => void;
  export let onNewOption: (option: { id: IRecordId; label: string }) => void;
  export let onConfigChange: (config: any) => void;
  export let dev_isHideEditOptions: boolean = false;
  let searchInputRef: any;
  let search: string = "";
  let originalConfig: ISelectPropertyConfig | undefined;
  let options: IPropertyConfigOption[] = property.config?.options ?? [];
  let isEditing: boolean = false;

  $: isMultiSelect = property.type === PropertyType.MULTI_SELECT;

  $: options =
    property.config?.options?.filter((x) =>
      x.label?.toLowerCase()?.includes(search.toLowerCase())
    ) ?? [];

  function onselect(e: CustomEvent<string>) {
    const val = e.detail;
    if (isMultiSelect) {
      if (typeof value === "string") {
        if (value === "none" || value === val) value = [val];
        else value = [value, val];
      } else if (Array.isArray(value)) {
        value = value.filter((x) => x !== "none");
        if (value.includes(val)) {
          value = value.filter((x) => x !== val);
        } else {
          value.push(val);
        }
      }
      value = value;
    } else {
      value = val;
    }
    onSelect(value);
  }
  function onenter(e: any) {
    if (options.length === 0 && e.detail) {
      const newOption = {
        id: property.id,
        label: e.detail.value
      };
      onNewOption(newOption);
      search = "";
    }
  }
  function onSave() {
    propagateConfigChange();
    isEditing = false;
  }

  function propagateConfigChange() {
    logger.log({
      at: "propagateConfigChange",
      config: property.config
    });
    const changes = {
      id: property.id,
      config: property.config,
      default: property.default
    };
    onConfigChange(changes);
  }
</script>

<div class="flex flex-col h--full w-full max-h-96 h-96 bg-bgs2">
  {#if isEditing && property.config}
    <div class="flex w-full flex-grow">
      <SelectOptionsEditor
        bind:config={property.config}
        parentBgIndex={2}
        bind:defaultOptionId={property.default}
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
    <div class="flex flex-col gap-6 w-full flex-grow styledscroll">
      {#key search}
        {#if property.config?.groups && isValidArrayWithData(property.config?.groups)}
          {#each property.config?.groups as group}
            <SelectPropertyOptionList
              groupId={group.id}
              groupLabel={group.label}
              {value}
              {options}
              {isMultiSelect}
              on:select={onselect}
            />
          {/each}
        {/if}
        <SelectPropertyOptionList
          {options}
          {value}
          {isMultiSelect}
          isPreventDefaultGroupLabel={!property.config?.groups ||
            property.config?.groups.length === 0}
          on:select={onselect}
        />
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
