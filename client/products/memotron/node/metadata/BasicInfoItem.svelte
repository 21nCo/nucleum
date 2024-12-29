<script lang="ts">
  import { userPreferences } from "$lib/client/components/settings/userPreferences.store";
  import { formatDatetime } from "$lib/client/utils/time.utils";

  export let label: string;
  export let value: string;
  function valueFormatter(value: string) {
    if (typeof value === "number") {
      return value;
    }
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      return formatDatetime($userPreferences, new Date(value));
    }
    return value;
  }
</script>

{#if label && value}
  <div class="flex justify-between gap-2 items-center w-full">
    <span class="text-fgs3 text-b3">{label}</span>
    <span class="text-fgs1 text-b2 text-right">{valueFormatter(value)}</span>
  </div>
{/if}
