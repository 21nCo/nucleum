<script lang="ts">
  import DatePicker from "$lib/client/elements/datetime/DatePicker.svelte";
  import TextInput from "$lib/client/elements/input/TextInput.svelte";
  import Rating from "$lib/client/elements/rating/Rating.svelte";
  import SwitchInput from "$lib/client/elements/toggle/SwitchInput.svelte";
  import view from "$lib/client/stores/view.store";
  import { Orientation } from "$lib/client/types/direction.enum";
  import { InputStyle } from "$lib/client/types/input.type";
  import { Size } from "$lib/client/types/size.enum";
  import { enumToString } from "$lib/shared/utils/text.utils";
  import { cn } from "$lib/client/utils/ui.utils";
  import MetaPropertyItem from "./MetaPropertyItem.svelte";
  import SingleSelectProperty from "./SingleSelectProperty.svelte";
  import {
    type IProperty,
    type IPropertyValue,
    PropertyType
  } from "./property.type";
  import type { IRecordId } from "$lib/client/types/data.type";
  export let value: IPropertyValue | null = null;
  export let property: IProperty;
  export let nodeId: IRecordId | undefined = undefined;
  /**
   * @deprecated - use context instead
   */
  export let isPropertiesPaneContext: boolean = false;
  export let context: "default" | "propertiesPane" | "collectionView" =
    "default";
  export let isReadMode: boolean = false;
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
        isReadMode
    }
  )}
>
  {#if property.type === PropertyType.TEXT}
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
    <SingleSelectProperty
      {style}
      {label}
      {property}
      dev_isHideEditOptions={context === "collectionView"}
      bind:value
      on:change
      on:newOption
      on:configChange
    />
  {:else if property.type === PropertyType.DATE && value && value instanceof Date}
    <DatePicker bind:date={value} {label} {style} on:change />
  {:else if nodeId}
    <MetaPropertyItem {property} {nodeId} />
  {/if}
</div>
