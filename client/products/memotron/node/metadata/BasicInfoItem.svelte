<script lang="ts">
  import { userPreferences } from "$lib/client/stores/app.store";
  import { formatDatetime } from "$lib/client/utils/time.utils";

  export let label: string;
  export let value: string;
  function valueFormatter(value: string) {
    if (value.includes("T")) {
      return formatDatetime($userPreferences, new Date(value));
    }
    return value;
  }
</script>

{#if label && value}
  <div class="flex justify-between items-center w-full">
    <span class="text-fgs3 text-b3">{label}</span>
    <span class="text-fgs1 text-b2">{valueFormatter(value)}</span>
  </div>
{/if}
