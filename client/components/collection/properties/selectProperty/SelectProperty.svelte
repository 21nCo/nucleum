<script lang="ts">
  import { InputStyle, type InputLabel } from "$lib/client/types/input.type";
  import { createEventDispatcher } from "svelte";
  import { Size } from "$lib/client/types/size.enum";
  import Icon from "$lib/client/elements/Icon.svelte";
  import SelectPropertyOption from "./SelectPropertyOption.svelte";
  import {
    iconSelectPropertyTypes,
    PropertyType,
    type IPropertyConfigOption,
    type ISelectProperty,
    type IUniversalProperty
  } from "../property.type";
  import { popover } from "$lib/client/actions/popover.action";
  import SelectPropertyOptionsPopover from "./SelectPropertyOptionsPopover.svelte";
  import { isValidArrayWithData } from "$lib/shared/utils/obj.utils";
  import type { IRecordId } from "$lib/client/types/data.type";
  import FormElement from "$lib/client/elements/FormElement.svelte";
  import IconSelect from "./IconSelect.svelte";
  const dispatch = createEventDispatcher();
  export let property: ISelectProperty | IUniversalProperty;
  export let options: IPropertyConfigOption[];
  export let style: InputStyle = InputStyle.FILLED;
  export let label: InputLabel | undefined = undefined;
  export let value: string | string[] | null;
  export let parentBackgroundIndex: number = 0;
  let isOptionsVisible: boolean = false;
  let classList = "relative flex flex-col items-start gap-1 w-full";
  let ref: HTMLElement;
  $: isMultiSelect =
    property.type === PropertyType.MULTI_SELECT ||
    (property.type === PropertyType.UNIVERSAL &&
      property.config?.isMultiSelect);

  $: isIconSelectType =
    property.type === PropertyType.UNIVERSAL &&
    property.config?.type &&
    iconSelectPropertyTypes.includes(property.config.type);

  function onSelect(val: string | string[]) {
    value = val;
    if (!isMultiSelect) hidePopover();
    dispatch("change", value);
  }

  function onNewOption(option: { id: IRecordId; label: string }) {
    dispatch("newOption", option);
    hidePopover();
  }
  function onConfigChange(changes: any) {
    property.config = changes.config;
    dispatch("configChange", changes);
  }

  function hidePopover() {
    ref?.dispatchEvent(new CustomEvent("hide"));
  }

  function shouldShowPlaceholder(val: string | string[] | null) {
    return (
      isEmptyValue() ||
      isEmptyMultiSelect() ||
      isInvalidSingleSelect() ||
      isInvalidStringValue()
    );

    function isEmptyValue() {
      return !val || val === "none";
    }

    function isEmptyMultiSelect() {
      return isMultiSelect && Array.isArray(val) && val.length === 0;
    }

    function isInvalidSingleSelect() {
      return (
        !isMultiSelect &&
        Array.isArray(val) &&
        (val.length !== 1 ||
          (val.length === 1 && !options?.some((x) => x.id === val[0])))
      );
    }

    function isInvalidStringValue() {
      return typeof val === "string" && !options?.some((x) => x.id === val);
    }
  }
</script>

<div class={classList}>
  <FormElement
    class="w-full"
    style={isIconSelectType ? InputStyle.PLAIN : style}
    {label}
    isFocused={isOptionsVisible}
  >
    {#if isIconSelectType}
      <IconSelect {options} {value} {onSelect} {isMultiSelect} />
    {:else}
      <div
        class="flex justify-between gap-4 w-full p-2"
        bind:this={ref}
        use:popover={{
          content: SelectPropertyOptionsPopover,
          id: "select-options-popover",
          isSpanToTriggerWidth: true,
          componentProps: {
            property: {
              id: property.id,
              type: property.type,
              config:
                property.type === PropertyType.UNIVERSAL
                  ? {
                      options,
                      type: property.config?.type
                    }
                  : property.config,
              default: property.default
            },
            isMultiSelect,
            value,
            onNewOption,
            onConfigChange,
            onSelect
          }
        }}
        on:change={(e) => {
          isOptionsVisible = e.detail?.open;
        }}
      >
        {#if shouldShowPlaceholder(value)}
          <span class="placeholder">
            Select {property?.label?.toLowerCase()}
          </span>
        {:else if value && isMultiSelect && isValidArrayWithData(value)}
          <div class="flex gap-2 flex-wrap w-full">
            {#each value as option}
              {@const item = options?.find((x) => x.id === option)}
              {#if item}
                <SelectPropertyOption
                  item={property.type === PropertyType.UNIVERSAL
                    ? {
                        ...item,
                        color: 50
                      }
                    : item}
                  isSelectedContext={true}
                />
              {/if}
            {/each}
          </div>
        {:else if typeof value === "string"}
          {@const item = options?.find((x) => x.id === value)}
          {#if item}
            <SelectPropertyOption
              item={property.type === PropertyType.UNIVERSAL
                ? {
                    ...item,
                    color: 50
                  }
                : item}
              isSelectedContext={true}
            />
          {/if}
        {/if}
        <Icon icon={isOptionsVisible ? "chevup" : "chevdown"} size={Size.sm} />
      </div>
    {/if}
  </FormElement>
</div>
