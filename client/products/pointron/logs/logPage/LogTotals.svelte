<script lang="ts">
  import { resolveSessionTimeSplit } from "@21n/products/pointron/pointron.utils";
  import LogTotalCard from "@21n/products/pointron/logs/logPage/LogTotalCard.svelte";
  export let log: any;
  $: totals = resolveSessionTimeSplit(log);
</script>

<div class="flex flex-wrap gap-2 justify-between w-full">
  <LogTotalCard value={totals.focus + totals.brek} type="total" />
  <LogTotalCard value={totals.focus} type="focus" />
  <LogTotalCard value={totals.brek} type="break" />
</div>
