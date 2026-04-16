<script lang="ts">
  import { TimePeriodType } from "@21n/types/time.type";
  import DropDown from "@21n/elements/dropdown/DropDown.svelte";
  import { InputStyle } from "@21n/types/input.type";
  import { Orientation } from "@21n/types/direction.enum";
  import { resolveRelativeTimePeriodOptions } from "@21n/elements/datetime/datetime.utils";
  import type { ISelectItem } from "@21n/types/select.type";
  let { scale, value, onChange }: any = $props();
  let dropDownValue = $state<string>("");
  const segments = $derived<ISelectItem[]>(resolveRelativeTimePeriodOptions(scale));

  $effect(() => {
    dropDownValue = `${value.type}#${value.param}`;
  });

  function handleSelect() {
    const [selectedType, selectedParam] = dropDownValue.split("#");
    if (
      selectedType !== TimePeriodType.RELATIVE &&
      selectedType !== TimePeriodType.UPPER_RELATIVE
    )
      return;
    value = {
      type: selectedType,
      param: parseInt(selectedParam ?? "0")
    };
    const changeEvent = new CustomEvent<any>("change", {
      detail: value
    });
    onChange?.(changeEvent);
  }
</script>

{#key segments}
  <DropDown
    items={segments}
    bind:value={dropDownValue}
    style={InputStyle.BORDERED}
    label={{ label: "Choose time period", orientation: Orientation.Vertical }}
    onSelect={handleSelect}
  />
{/key}
