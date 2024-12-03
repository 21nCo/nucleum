<script lang="ts">
  import DatePicker from "$lib/client/elements/datetime/DatePicker.svelte";
  import TextInput from "$lib/client/elements/input/TextInput.svelte";
  import Rating from "$lib/client/elements/rating/Rating.svelte";
  import SwitchInput from "$lib/client/elements/toggle/SwitchInput.svelte";
  import view from "$lib/client/stores/view.store";
  import { Orientation } from "$lib/client/types/direction.enum";
  import { InputStyle } from "$lib/client/types/input.type";
  import { Size } from "$lib/client/types/size.enum";
  import { enumToString, isValidString } from "$lib/shared/utils/text.utils";
  import { cn } from "$lib/client/utils/ui.utils";
  import MetaPropertyItem from "./MetaPropertyItem.svelte";
  import SingleSelectProperty from "./selectProperty/SingleSelectProperty.svelte";
  import {
    type IProperty,
    type IPropertyValue,
    PropertyType
  } from "./property.type";
  import type { IRecordId } from "$lib/client/types/data.type";
  import SelectPropertyItem from "./selectProperty/SelectPropertyItem.svelte";
  import Text from "$lib/client/elements/text/Text.svelte";
  import { TextStyle } from "$lib/client/types/text.enum";
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
  let style =
    context === "collectionView" ? InputStyle.PLAIN : InputStyle.FILLED;

  if (property.type === PropertyType.DATE && typeof value === "string") {
    value = new Date(value);
  }

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
  // $: console.log({ property, details: config });

  function formatValue(value: any) {
    if (value instanceof Date) {
      return value.toLocaleString();
    }
    return value;
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
            const url = value?.includes("http") ? value : `https://${value}`;
            window.open(url, "_blank");
          } else if (property.type === PropertyType.EMAIL) {
            window.open(`mailto:${value}`, "_blank");
          }
        }}
      >
        {#if property.type === PropertyType.SINGLE_SELECT}
          <SelectPropertyItem
            isPlain={true}
            item={property.config?.options?.find(
              (x) =>
                x.id === value || (value === null && x.id === property.default)
            )}
            isSelectedContext={true}
          />
        {:else if property.type === PropertyType.RATING}
          <Rating
            isReadOnlyMode={true}
            size={context === "collectionView" ? Size.md : Size.lg}
            avatar={property.config?.ratingAvatar}
            {value}
            count={5}
          />
        {:else}
          {value && isValidString(value.toString())
            ? formatValue(value)
            : "N/A"}
        {/if}
      </button>
    </div>
  {:else if property.type === PropertyType.TEXT}
    <TextInput {style} bind:value {label} placeholder="Enter text" on:change />
  {:else if property.type === PropertyType.NUMBER || property.type === PropertyType.EMAIL || property.type === PropertyType.URL}
    <TextInput
      {style}
      bind:value
      {label}
      placeholder={`Enter ${property.type}`}
      on:change
      type={property.type}
    />
  {:else if property.type === PropertyType.CHECKBOX && typeof value === "boolean"}
    <!-- <CheckboxInput bind:checked={property.value} label={details.label} /> -->
    <SwitchInput bind:checked={value} {label} {style} on:change />
  {:else if property.type === PropertyType.RATING && property.config?.ratingAvatar && typeof value === "number"}
    <Rating
      {label}
      {style}
      size={context === "collectionView" ? Size.md : Size.lg}
      avatar={property.config.ratingAvatar}
      bind:value
      count={5}
      on:change
    />
  {:else if property.type === PropertyType.SINGLE_SELECT && property.config?.options && typeof value === "string"}
    {#if context === "collectionView"}
      <SelectPropertyItem
        item={property.config.options?.find(
          (x) => x.id === value || (value === null && x.id === property.default)
        )}
        isSelectedContext={true}
      />
    {:else}
      <SingleSelectProperty
        {style}
        {label}
        {property}
        bind:value
        on:change
        on:newOption
        on:configChange
      />
    {/if}
  {:else if property.type === PropertyType.DATE && value && value instanceof Date}
    <DatePicker bind:date={value} {label} {style} on:change />
  {:else if nodeId}
    <MetaPropertyItem {property} {nodeId} />
  {/if}
</div>
