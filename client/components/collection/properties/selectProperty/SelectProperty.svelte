<script lang="ts">
  import { InputStyle, type InputLabel } from "@21n/types/input.type";
  import { createEventDispatcher } from "svelte";
  import { Size } from "@21n/types/size.enum";
  import Icon from "@21n/elements/Icon.svelte";
  import SelectPropertyOption from "@21n/components/collection/properties/selectProperty/SelectPropertyOption.svelte";
  import {
    iconSelectPropertyTypes,
    PropertyType,
    type IPropertyConfigOption,
    type ISelectProperty,
    type IUniversalProperty
  } from "@21n/components/collection/properties/property.type";
  import { popover } from "@21n/actions/popover.action";
  import SelectPropertyOptionsPopover from "@21n/components/collection/properties/selectProperty/SelectPropertyOptionsPopover.svelte";
  import { isValidArrayWithData } from "@21n/shared-utils/obj.utils";
  import type { IRecordId } from "@21n/types/data.type";
  import FormElement from "@21n/elements/FormElement.svelte";
  import IconSelect from "@21n/components/collection/properties/selectProperty/IconSelect.svelte";
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

  function onPopoverChange(e: Event) {
    const detail = (e as CustomEvent<{ open?: boolean }>).detail;
    isOptionsVisible = detail?.open ?? false;
  }

  function resolvePropertyId() {
    if ("id" in property && property.id) {
      return property.id.toString();
    }
    return "";
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
    parentBgIndex={parentBackgroundIndex}
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
              id: resolvePropertyId(),
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
        on:change={onPopoverChange}
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
        <Icon
          icon={isOptionsVisible ? "chevron-up" : "chevron-down"}
          size={Size.sm}
        />
      </div>
    {/if}
  </FormElement>
</div>
