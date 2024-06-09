<script lang="ts">
  import { sessionTotals } from "$lib/client/components/pointron/pointron.utils";
  import LogTotalCard from "./LogTotalCard.svelte";
  export let log: any;
  const { totalFocus, totalBreak } = sessionTotals(log);
  let total = totalFocus + totalBreak;
</script>

<div class="flex flex-wrap gap-2 justify-between w-full">
  <LogTotalCard value={totalFocus} type="focus" />
  <LogTotalCard value={totalBreak} type="break" />
  <LogTotalCard value={total} type="total" />
</div>
