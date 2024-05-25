<script lang="ts">
  import {
    PropertyType,
    type Property,
    type Type
  } from "$lib/tidy/types/memotron/type.type";
  import DatePicker from "$lib/tidy/elements/datetime/DatePicker.svelte";
  import TextInput from "$lib/tidy/elements/input/TextInput.svelte";
  import Rating from "$lib/tidy/elements/rating/Rating.svelte";
  import SwitchInput from "$lib/tidy/elements/toggle/SwitchInput.svelte";
  import view from "$lib/tidy/stores/view.store";
  import { Orientation } from "$lib/tidy/types/direction.enum";
  import { InputStyle } from "$lib/tidy/types/input.type";
  import type { NodeProperty } from "$lib/tidy/types/memotron/node.type";
  import { Size } from "$lib/tidy/types/size.enum";
  import { enumToString } from "$lib/tidy/utils/text.utils";
  import { cn } from "$lib/tidy/utils/ui.utils";
  import MetaPropertyItem from "./MetaPropertyItem.svelte";
  import SingleSelectProperty from "./SingleSelectProperty.svelte";
  export let property: NodeProperty;
  export let type: Type;
  export let nodeId: string | undefined = undefined;
  export let isPropertiesPaneContext: boolean = false;
  export let isReadMode: boolean = false;
  let style = InputStyle.FILLED;
  let config: Property = type.properties.find((x: any) => x.id === property.id);
  if (config.type === PropertyType.DATE && typeof property.value === "string") {
    property.value = new Date(property.value);
  }
  let label = {
    label: config.label ? config.label : enumToString(config.type),
    orientation: Orientation.Vertical
  };
  $: console.log({ property, details: config });
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
    />
  {:else if config.type === PropertyType.CHECKBOX && typeof property.value === "boolean"}
    <!-- <CheckboxInput bind:checked={property.value} label={details.label} /> -->
    <SwitchInput bind:checked={property.value} {label} {style} />
  {:else if config.type === PropertyType.RATING && config.config?.ratingAvatar && typeof property.value === "number"}
    <Rating
      {label}
      {style}
      size={Size.lg}
      avatar={config.config.ratingAvatar}
      bind:value={property.value}
      count={5}
    />
  {:else if config.type === PropertyType.SINGLE_SELECT && config.config?.options && typeof property.value === "string"}
    <SingleSelectProperty
      {style}
      {label}
      property={config}
      bind:value={property.value}
    />
  {:else if config.type === PropertyType.DATE && property.value && property.value instanceof Date}
    <DatePicker bind:date={property.value} {label} {style} />
  {:else if nodeId}
    <MetaPropertyItem {config} {nodeId} />
  {/if}
</div>
