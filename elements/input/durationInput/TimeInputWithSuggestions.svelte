<script lang="ts">
  import type { DbRecordWithLabel } from "$lib/tidy/types/dbrecord.type";
  import { TimeUnit } from "$lib/tidy/types/time.type";
  import { createEventDispatcher } from "svelte";
  import TextInput from "../TextInput.svelte";
  const dispatch = createEventDispatcher();
  export let units: TimeUnit[];
  export let duration: number;
  export let currentUnit: TimeUnit;
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
      input <= 20 &&
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
    let suggestions: DbRecordWithLabel[] = [];
    if (searchQuery.length > 0) {
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
</script>

<TextInput
  bind:value
  placeholder="Duration"
  searchCallback={onsearch}
  on:select={onselect}
/>
