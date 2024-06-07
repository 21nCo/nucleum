<script lang="ts">
  import { sessionTotals } from "$lib/client/components/pointron/local.utils";
  import LogTotalCard from "./LogTotalCard.svelte";
  export let log: any;
  const { totalFocus, totalBreak } = sessionTotals(log);
  let total = totalFocus + totalBreak;
</script>

<div class="flex flex-wrap justify-between w-full">
  <LogTotalCard value={total} type="total" />
  <LogTotalCard value={totalFocus} type="focus" />
  <LogTotalCard value={totalBreak} type="break" />
</div>
