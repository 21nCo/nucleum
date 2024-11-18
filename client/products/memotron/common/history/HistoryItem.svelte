<script lang="ts">
  import { userPreferences } from "$lib/client/components/settings/userPreferences.store";
  import { formatDatetime } from "$lib/client/utils/time.utils";

  export let item: { action: string; timestamp: Date };
</script>

<div class="flex w-full items-center justify-between">
  <span class="text-b2">{item.action}</span>
  <span class="text-b3 text-fgs3 text-opacity-70"
    >{formatDatetime($userPreferences, item.timestamp)}</span
  >
</div>
