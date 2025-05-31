<script lang="ts">
  import { userPreferences } from "$lib/client/components/settings/userPreferences.store";
  import { formatDatetime } from "$lib/client/utils/time.utils";

  export let label: string;
  export let value: string | string[] | number | undefined = undefined;
  function valueFormatter(value: string | string[] | number) {
    if (typeof value === "number") {
      return value;
    }
    if (Array.isArray(value)) {
      return value.join(", ");
    }
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      return formatDatetime($userPreferences, new Date(value));
    }
    return value;
  }
</script>

{#if label}
  <div class="flex justify-between gap-2 items-center w-full">
    <span class="text-fgs3 text-b3">{label}</span>
    <slot>
      {#if value}
        <span class="text-fgs1 text-b2 text-right default-typeface"
          >{valueFormatter(value)}</span
        >
      {/if}
    </slot>
  </div>
{/if}
