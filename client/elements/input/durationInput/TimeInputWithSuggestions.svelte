<script lang="ts">
  import { TimeUnit } from "$lib/client/types/time.type";
  import { createEventDispatcher } from "svelte";
  import { cn } from "$lib/client/utils/ui.utils";
  import TextSearchInput from "../TextSearchInput.svelte";
  import { InputStyle } from "$lib/client/types/input.type";
  const dispatch = createEventDispatcher();
  export let units: TimeUnit[];
  export let duration: number;
  export let currentUnit: TimeUnit;
  export let hoursLimit: number | undefined = undefined;
  /**
   * Suggestions are temporarily disabled due to lack of reliability.
   */
  export let isSuggestionsDisabled: boolean = true;
  let isFocusing: boolean = false;
  let value = "";
  $: {
    if (currentUnit === TimeUnit.HOURS) {
      value = `${duration / 3600}`;
    } else if (currentUnit === TimeUnit.MINUTES) {
      value = `${duration / 60}`;
    } else {
      value = `${duration}`;
    }
  }

  /**
   * Generate suggestions based on the search
   * Examples: 1h, 1h 30m, 1m, 1m 30s
   *
   * @param searchQuery
   */
  function generateSuggestions(searchQuery: string) {
    const input = parseFloat(searchQuery);
    if (!isNaN(input)) {
    }
    let suggestions: any[] = [];
    const hasLetter = /[a-z]/i.test(searchQuery);

    if (
      units.includes(TimeUnit.HOURS) &&
      ((hoursLimit && input <= hoursLimit) || !hoursLimit) &&
      (!hasLetter || /h(o(u(r)?)?)?.*/i.test(searchQuery.toLowerCase()))
    ) {
      const hours = Math.floor(input);
      const minutes = Math.round((input - hours) * 60);
      let suggestion = `${hours} hour${hours !== 1 ? "s" : ""}`;
      if (minutes !== 0) {
        suggestion += ` ${minutes} minute${minutes !== 1 ? "s" : ""}`;
      }
      const valueInSeconds = hours * 3600 + minutes * 60;
      suggestions.push({
        label: suggestion,
        value: valueInSeconds,
        unit: TimeUnit.HOURS
      });
    }
    if (
      units.includes(TimeUnit.MINUTES) &&
      (!hasLetter ||
        /m(i(n(u(t(e(s)?)?)?)?)?)?.*/i.test(searchQuery.toLowerCase()))
    ) {
      const minutes = Math.floor(input);
      const seconds = Math.round((input - minutes) * 60);
      let suggestion = `${minutes} minute${minutes !== 1 ? "s" : ""}`;
      if (seconds !== 0) {
        suggestion += ` ${seconds} second${seconds !== 1 ? "s" : ""}`;
      }
      const valueInSeconds = minutes * 60 + seconds;
      suggestions.push({
        label: suggestion,
        value: valueInSeconds,
        unit: TimeUnit.MINUTES
      });
    }
    return suggestions;
  }
  function onsearch(searchQuery: string) {
    console.log({ value: searchQuery });
    let suggestions: { label: string; value: number; unit: TimeUnit }[] = [];
    if (searchQuery.length > 0 && !isSuggestionsDisabled) {
      suggestions = generateSuggestions(searchQuery);
    }
    console.log({ suggestions });
    return suggestions;
  }
  function onselect(
    event: CustomEvent<{
      item: { label: string; value: number; unit: TimeUnit };
    }>
  ) {
    duration = event.detail.item.value;
    currentUnit = event.detail.item.unit;
    dispatch("change", { value: duration, unit: currentUnit });
  }
  function onkeyup(
    x: CustomEvent<{
      value: string;
      event: KeyboardEvent;
      isShowSearchResults: boolean;
    }>
  ) {
    console.log("onkeyup", x);
    const event = x.detail.event;
    if (x.detail.isShowSearchResults) return;
    if (!/^\d+$/.test(x.detail.value)) return;
    if (event.key === "ArrowDown") {
      value = (+value - 1).toString();
    } else if (event.key === "ArrowUp") {
      value = (+value + 1).toString();
    }
    duration =
      +value *
      (currentUnit === TimeUnit.HOURS
        ? 3600
        : currentUnit === TimeUnit.MINUTES
          ? 60
          : 1);
    dispatch("change", { value: duration, unit: currentUnit });
    event.preventDefault();
  }
  function onChange(event: any) {
    if (!event.detail?.value) return;
    if (!/^\d+$/.test(value)) return;
    duration =
      +value *
      (currentUnit === TimeUnit.HOURS
        ? 3600
        : currentUnit === TimeUnit.MINUTES
          ? 60
          : 1);
    dispatch("change", { value: duration, unit: currentUnit });
  }
</script>

<div
  class={cn("flex w-full rounded-l-md border p-2 default-typeface", {
    "border-brs3": !isFocusing,
    "border-aps1": isFocusing
  })}
>
  <TextSearchInput
    bind:value
    on:keyup={onkeyup}
    on:focus={() => (isFocusing = true)}
    on:blur={() => (isFocusing = false)}
    on:change={onChange}
    style={InputStyle.PLAIN}
    placeholder="Duration"
    searchCallback={isSuggestionsDisabled ? undefined : onsearch}
    on:select={onselect}
    popoverOptions={{ offsetInPx: 10 }}
  />
</div>
