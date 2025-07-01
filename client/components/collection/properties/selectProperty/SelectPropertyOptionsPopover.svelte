<script lang="ts">
  import { Size } from "$lib/client/types/size.enum";
  import { deepCopy, isValidArrayWithData } from "$lib/shared/utils/obj.utils";
  import TextInput from "$lib/client/elements/input/TextInput.svelte";
  import Button from "$lib/client/elements/button/Button.svelte";
  import {
    type ISelectPropertyConfig,
    type IUniversalPropertyConfig,
    type IPropertyConfigOption,
    PropertyType,
    UniversalPropertyType
  } from "../property.type";
  import SelectOptionsEditor from "../propertyConfig/selectProperty/SelectOptionsEditor.svelte";
  import { ButtonStyle, ButtonVariant } from "$lib/client/types/button.type";
  import { logger } from "$lib/client/components/debug/logger.client";
  import SelectPropertyOptionList from "./SelectPropertyOptionList.svelte";
  import type { IRecordId } from "$lib/client/types/data.type";
  import {
    resolveSelectPropertySelection,
    isHighVolumeUniversalType,
    resolveUniversalPropertyOptions
  } from "../property.utils";
  import { uiState } from "$lib/client/stores/uiState/uiState.store";
  import {
    UIState,
    UIStateScope
  } from "$lib/client/stores/uiState/uiState.type";

  export let property: {
    id: IRecordId;
    type:
      | PropertyType.SINGLE_SELECT
      | PropertyType.MULTI_SELECT
      | PropertyType.UNIVERSAL;
    config: ISelectPropertyConfig | IUniversalPropertyConfig;
    default: any;
  };
  export let isMultiSelect: boolean;
  export let value: string | string[];
  export let onSelect: (value: string | string[]) => void;
  export let onNewOption: (option: { id: IRecordId; label: string }) => void;
  export let onConfigChange: (config: any) => void;
  let searchInputRef: any;
  let search: string = "";
  let originalConfig:
    | ISelectPropertyConfig
    | IUniversalPropertyConfig
    | undefined;
  let isEditing: boolean = false;

  $: universalType =
    property.type === PropertyType.UNIVERSAL
      ? (property.config as IUniversalPropertyConfig)?.type
      : undefined;

  $: allUniversalOptions =
    property.type === PropertyType.UNIVERSAL && universalType
      ? resolveUniversalPropertyOptions(universalType)
      : [];

  $: regularOptions =
    property.type !== PropertyType.UNIVERSAL
      ? ((property.config as ISelectPropertyConfig)?.options ?? [])
      : [];

  $: selectConfig =
    property.type !== PropertyType.UNIVERSAL
      ? (property.config as ISelectPropertyConfig)
      : undefined;

  $: isHighVolumeType =
    property.type === PropertyType.UNIVERSAL &&
    universalType &&
    isHighVolumeUniversalType(universalType);

  function getRecentlySelectedOptions(type: UniversalPropertyType): string[] {
    if (!isHighVolumeUniversalType(type)) return [];

    const recent = uiState.getState(UIState.universalPropertyRecents, {
      scope: UIStateScope.PRODUCT,
      subVariables: [type]
    });
    return recent || [];
  }

  function addToRecentlySelectedOptions(
    type: UniversalPropertyType,
    optionId: string
  ): void {
    if (!isHighVolumeUniversalType(type)) return;
    const current = getRecentlySelectedOptions(type);

    const filtered = current.filter((id) => id !== optionId);
    const updated = [optionId, ...filtered].slice(0, 5);

    uiState.setState(UIState.universalPropertyRecents, updated, {
      scope: UIStateScope.PRODUCT,
      subVariables: [type]
    });
  }

  function getOptionsWithRecents(
    type: UniversalPropertyType,
    allOptions: IPropertyConfigOption[],
    search?: string
  ): {
    recentOptions: IPropertyConfigOption[];
    filteredOptions: IPropertyConfigOption[];
  } {
    if (!isHighVolumeUniversalType(type)) {
      const filtered = search
        ? allOptions.filter((option) =>
            option.label?.toLowerCase()?.includes(search.toLowerCase())
          )
        : allOptions;
      return { recentOptions: [], filteredOptions: filtered };
    }

    const recentIds = getRecentlySelectedOptions(type);
    const recentOptions = recentIds
      .map((id) => allOptions.find((option) => option.id === id))
      .filter(Boolean) as IPropertyConfigOption[];

    const filteredOptions = allOptions.filter((option) => {
      const matchesSearch =
        !search || option.label?.toLowerCase()?.includes(search.toLowerCase());
      const isNotRecent = !recentIds.includes(option.id);
      return matchesSearch && isNotRecent;
    });

    const filteredRecentOptions = search
      ? recentOptions.filter((option) =>
          option.label?.toLowerCase()?.includes(search.toLowerCase())
        )
      : recentOptions;

    return { recentOptions: filteredRecentOptions, filteredOptions };
  }

  $: ({ recentOptions, filteredOptions } =
    property.type === PropertyType.UNIVERSAL && universalType
      ? getOptionsWithRecents(universalType, allUniversalOptions, search)
      : { recentOptions: [], filteredOptions: [] });
  $: options =
    property.type === PropertyType.UNIVERSAL
      ? filteredOptions
      : regularOptions.filter((x) =>
          x.label?.toLowerCase()?.includes(search.toLowerCase())
        );

  function onselect(e: CustomEvent<string>) {
    const val = e.detail;
    value = resolveSelectPropertySelection(value, val, { isMultiSelect });

    if (
      property.type === PropertyType.UNIVERSAL &&
      universalType &&
      isHighVolumeUniversalType(universalType)
    ) {
      addToRecentlySelectedOptions(universalType, val);
    }

    onSelect(value);
  }

  function onenter(e: any) {
    if (
      property.type === PropertyType.UNIVERSAL ||
      options.length > 0 ||
      !e.detail
    ) {
      return;
    }
    const newOption = {
      id: property.id,
      label: e.detail.value
    };
    onNewOption(newOption);
    search = "";
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
  {#if isEditing && selectConfig && property.type !== PropertyType.UNIVERSAL}
    <div class="flex w-full flex-grow">
      <SelectOptionsEditor
        bind:config={selectConfig}
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
        placeholder={property.type === PropertyType.UNIVERSAL
          ? "Search options"
          : "Search or type to create new"}
      />
      <!-- TODO - render config settings in popover -->
    </div>
    <div class="flex flex-col gap-6 w-full flex-grow styledscroll">
      {#key search}
        {#if isHighVolumeType && recentOptions.length > 0}
          <SelectPropertyOptionList
            options={recentOptions}
            {value}
            {isMultiSelect}
            isPreventTagStyle={property.type === PropertyType.UNIVERSAL}
            groupLabel="Recently used"
            on:select={onselect}
          />
        {/if}

        {#if property.config && "groups" in property.config && property.config?.groups && isValidArrayWithData(property.config?.groups)}
          {#each property.config?.groups as group}
            <SelectPropertyOptionList
              groupId={group.id}
              groupLabel={group.label}
              isPreventTagStyle={property.type === PropertyType.UNIVERSAL}
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
          isPreventTagStyle={property.type === PropertyType.UNIVERSAL}
          isPreventDefaultGroupLabel={!(
            property.config &&
            "groups" in property.config &&
            property.config?.groups
          ) ||
            (property.config &&
              "groups" in property.config &&
              property.config?.groups?.length === 0)}
          on:select={onselect}
        />
        {#if search && !options.length && (!isHighVolumeType || !recentOptions.length)}
          <div class="text-b2 text-fgs3 px-3 py-2">
            No results found.
            {#if property.type !== PropertyType.UNIVERSAL}
              Press Enter to create new
            {/if}
          </div>
        {/if}
      {/key}
    </div>
  {/if}
  {#if property.type !== PropertyType.UNIVERSAL}
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
              if (originalConfig) {
                property.config = originalConfig;
              }
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
      {:else}
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
  {/if}
</div>
