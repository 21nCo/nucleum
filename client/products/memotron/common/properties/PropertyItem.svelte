<script lang="ts">
  import {
    PropertyType,
    type IProperty,
    type IType
  } from "$lib/client/types/memotron/type.type";
  import DatePicker from "$lib/client/elements/datetime/DatePicker.svelte";
  import TextInput from "$lib/client/elements/input/TextInput.svelte";
  import Rating from "$lib/client/elements/rating/Rating.svelte";
  import SwitchInput from "$lib/client/elements/toggle/SwitchInput.svelte";
  import view from "$lib/client/stores/view.store";
  import { Orientation } from "$lib/client/types/direction.enum";
  import { InputStyle } from "$lib/client/types/input.type";
  import type { INodeProperty } from "$lib/client/types/memotron/node.type";
  import { Size } from "$lib/client/types/size.enum";
  import { enumToString } from "$lib/client/utils/text.utils";
  import { cn } from "$lib/client/utils/ui.utils";
  import MetaPropertyItem from "./MetaPropertyItem.svelte";
  import SingleSelectProperty from "./SingleSelectProperty.svelte";
  export let property: INodeProperty;
  export let type: IType;
  export let nodeId: string | undefined = undefined;
  export let isPropertiesPaneContext: boolean = false;
  export let isReadMode: boolean = false;
  let style = InputStyle.FILLED;
  let config: IProperty = type.properties.find(
    (x: any) => x.id === property.id
  );
  if (config.type === PropertyType.DATE && typeof property.value === "string") {
    property.value = new Date(property.value);
  }
  let label = {
    label: config.label ? config.label : enumToString(config.type),
    orientation: Orientation.Vertical
  };
  // $: console.log({ property, details: config });
</script>

<div
  class={cn("flex", {
    "w-60 max-w-md grow": !$view.isPortrait,
    "w-full": $view.isPortrait || isPropertiesPaneContext || isReadMode
  })}
>
  {#if config.type === PropertyType.TEXT}
    <TextInput
      {style}
      bind:value={property.value}
      label={label.label}
      placeholder="Enter text"
      on:change
    />
  {:else if config.type === PropertyType.CHECKBOX && typeof property.value === "boolean"}
    <!-- <CheckboxInput bind:checked={property.value} label={details.label} /> -->
    <SwitchInput bind:checked={property.value} {label} {style} on:change />
  {:else if config.type === PropertyType.RATING && config.config?.ratingAvatar && typeof property.value === "number"}
    <Rating
      {label}
      {style}
      size={Size.lg}
      avatar={config.config.ratingAvatar}
      bind:value={property.value}
      count={5}
      on:change
    />
  {:else if config.type === PropertyType.SINGLE_SELECT && config.config?.options && typeof property.value === "string"}
    <SingleSelectProperty
      {style}
      {label}
      property={config}
      bind:value={property.value}
      on:change
    />
  {:else if config.type === PropertyType.DATE && property.value && property.value instanceof Date}
    <DatePicker bind:date={property.value} {label} {style} on:change />
  {:else if nodeId}
    <MetaPropertyItem {config} {nodeId} />
  {/if}
</div>
