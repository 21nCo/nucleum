<script lang="ts">
  import DatePicker from "$lib/client/elements/datetime/DatePicker.svelte";
  import TextInput from "$lib/client/elements/input/TextInput.svelte";
  import Rating from "$lib/client/products/memotron/collection/properties/ratingProperty/Rating.svelte";
  import SwitchInput from "$lib/client/elements/toggle/SwitchInput.svelte";
  import view from "$lib/client/stores/view.store";
  import { Orientation } from "$lib/client/types/direction.enum";
  import { InputStyle } from "$lib/client/types/input.type";
  import { enumToString, isValidString } from "$lib/shared/utils/text.utils";
  import { cn } from "$lib/client/utils/ui.utils";
  import MetaPropertyItem from "./MetaPropertyItem.svelte";
  import SelectProperty from "./selectProperty/SelectProperty.svelte";
  import {
    type IProperty,
    type IPropertyValue,
    type ISelectProperty,
    type IUniversalProperty,
    manualPropertyTypes,
    PropertyType,
    textPropertyTypes
  } from "./property.type";
  import {
    PersistenceActionType,
    type IRecordId
  } from "$lib/client/types/data.type";
  import SelectPropertyOption from "./selectProperty/SelectPropertyOption.svelte";
  import Text from "$lib/client/elements/text/Text.svelte";
  import { TextStyle } from "$lib/client/types/text.enum";
  import {
    resolvePropertyDefaultValue,
    resolveUniversalPropertyOptions
  } from "./property.utils";
  import { isValidArrayWithData } from "$lib/shared/utils/obj.utils";
  import ComponentBaseLayer from "$lib/client/layout/layers/ComponentBaseLayer.svelte";
  import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
  import { resourceInList } from "$lib/client/components/flux/resourceStores/resource.utils";
  export let value: IPropertyValue | null = null;
  export let property: IProperty;
  export let nodeId: IRecordId | undefined = undefined;
  /**
   * @deprecated - use context instead
   */
  export let isPropertiesPaneContext: boolean = false;
  export let context: "default" | "propertiesPane" | "collectionView" =
    "default";
  export let isReadOnlyMode: boolean = false;
  let _value: IPropertyValue | null = assignDefaultValue(value);
  $: options =
    property.type === PropertyType.SINGLE_SELECT ||
    property.type === PropertyType.MULTI_SELECT ||
    property.type === PropertyType.UNIVERSAL
      ? resolveOptionsForSelect(property)
      : [];

  let style =
    context === "collectionView" ? InputStyle.PLAIN : InputStyle.FILLED;

  let label =
    context === "collectionView" && property.type !== PropertyType.CHECKBOX
      ? undefined
      : {
          label: property.label ? property.label : enumToString(property.type),
          orientation:
            context === "collectionView"
              ? Orientation.Horizontal
              : Orientation.Vertical
        };

  function assignDefaultValue(value: IPropertyValue | null) {
    if (property.type === PropertyType.DATE && typeof value === "string") {
      const dateObj = new Date(value);
      value = !isNaN(dateObj.getTime()) ? dateObj : null;
    } else if (
      property.type === PropertyType.NUMBER &&
      typeof value === "string"
    ) {
      value = parseFloat(value);
    } else if (
      textPropertyTypes.includes(property.type) &&
      Array.isArray(value)
    ) {
      value = "";
    }
    if (
      !value ||
      (Array.isArray(value) && value.length === 0) ||
      (property.type === PropertyType.SINGLE_SELECT &&
        typeof value !== "string") ||
      (property.type === PropertyType.NUMBER && typeof value !== "number")
    ) {
      value = resolvePropertyDefaultValue(property.type) ?? null;
    }
    return value;
  }

  function formatValue(value: any) {
    if (value instanceof Date) {
      return value.toLocaleString();
    }
    return value;
  }

  function resolveOptionsForSelect(
    property: ISelectProperty | IUniversalProperty
  ) {
    if (property.type === PropertyType.UNIVERSAL) {
      if (!property.config) return [];
      return resolveUniversalPropertyOptions(property.config.type);
    }
    return property.config?.options ?? [];
  }

  function onChangesElsewhere(e: any) {
    const { action, record } = e.detail?.params;
    if (action !== PersistenceActionType.MERGE || !record || !record.properties)
      return;
    const { properties } = record;
    const prop = properties.find(resourceInList(property.id));
    if (!prop) return;
    if (prop.value.toString() !== _value?.toString()) {
      _value = assignDefaultValue(prop.value);
    }
  }
</script>

<div
  class={cn(
    "flex",
    context !== "collectionView" && {
      "w-60 max-w-md grow": !$view.isPortrait,
      "w-full":
        $view.isPortrait ||
        isPropertiesPaneContext ||
        context === "propertiesPane" ||
        isReadOnlyMode
    }
  )}
>
  {#if isReadOnlyMode}
    <div class="w-full h-full flex flex-col gap-1 justify-center">
      <Text content={property.label} style={TextStyle.SECTION_HEADING_SMALL} />
      <button
        class={cn("text-left text-b2 w-fit", {
          "underline-dotted":
            property.type === PropertyType.URL ||
            property.type === PropertyType.EMAIL
        })}
        on:click={() => {
          if (property.type === PropertyType.URL) {
            const url = _value?.toString().includes("http")
              ? _value.toString()
              : `https://${_value}`;
            window.open(url, "_blank");
          } else if (property.type === PropertyType.EMAIL) {
            window.open(`mailto:${_value}`, "_blank");
          }
        }}
      >
        {#if property.type === PropertyType.SINGLE_SELECT}
          <SelectPropertyOption
            item={property.config?.options?.find(
              (x) =>
                x.id === _value ||
                (_value === null && x.id === property.default)
            )}
            isSelectedContext={true}
          />
        {:else if property.type === PropertyType.RATING && typeof _value === "number"}
          <Rating
            isReadOnlyMode={true}
            avatar={property.config?.avatar}
            value={_value ?? 0}
            count={5}
          />
        {:else}
          {_value && isValidString(_value.toString())
            ? formatValue(_value)
            : "N/A"}
        {/if}
      </button>
    </div>
  {:else if property.type === PropertyType.TEXT}
    <TextInput
      {style}
      bind:value={_value}
      {label}
      placeholder="Enter text"
      on:change
    />
  {:else if property.type === PropertyType.NUMBER || property.type === PropertyType.EMAIL || property.type === PropertyType.URL}
    <TextInput
      {style}
      bind:value={_value}
      {label}
      placeholder={`Enter ${property.type}`}
      on:change
      type={property.type}
    />
  {:else if property.type === PropertyType.CHECKBOX && typeof _value === "boolean"}
    <!-- <CheckboxInput bind:checked={property.value} label={details.label} /> -->
    <SwitchInput bind:checked={_value} {label} {style} on:change />
  {:else if property.type === PropertyType.RATING && typeof _value === "number"}
    <Rating
      {label}
      {style}
      avatar={property.config?.avatar}
      bind:value={_value}
      count={5}
      on:change
    />
  {:else if property.type === PropertyType.SINGLE_SELECT || property.type === PropertyType.MULTI_SELECT || property.type === PropertyType.UNIVERSAL}
    {#if context === "collectionView"}
      {#if isValidArrayWithData(_value)}
        <div class="flex gap-2 flex-wrap w-full">
          {#each _value as value}
            <SelectPropertyOption
              item={options?.find((x) => x.id === value)}
              isSelectedContext={true}
            />
          {/each}
        </div>
      {:else if _value && _value !== "none"}
        <SelectPropertyOption
          item={options?.find(
            (x) =>
              x.id === _value || (_value === null && x.id === property.default)
          )}
          isSelectedContext={true}
        />
      {/if}
    {:else}
      <SelectProperty
        {style}
        {label}
        {property}
        {options}
        bind:value={_value}
        on:change
        on:newOption
        on:configChange
      />
    {/if}
  {:else if property.type === PropertyType.DATE}
    <DatePicker bind:date={_value} {label} {style} on:change />
  {:else if nodeId}
    <MetaPropertyItem {property} {nodeId} />
  {/if}
</div>

{#if !isReadOnlyMode && nodeId && manualPropertyTypes.includes(property.type)}
  <ComponentBaseLayer
    subscribeToResource={new Set([Resource.node])}
    subscribeToRecords={[nodeId]}
    on:change={onChangesElsewhere}
  />
{/if}
