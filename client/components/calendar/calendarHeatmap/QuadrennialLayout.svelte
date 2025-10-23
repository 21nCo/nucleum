<script lang="ts">
  import MacroIndicatorTIle from "@21n/components/calendar/calendarHeatmap/MacroIndicatorTIle.svelte";
  export let data: any;
  let [QD, QDData] = data;
</script>

<div id={QD} class="quad">
  {#each QDData as yearData, index (index)}
    <MacroIndicatorTIle data={yearData} />
  {/each}
</div>

<style>
  .quad {
    display: grid;
    grid-auto-flow: column;
    grid-template-rows: repeat(4, auto);
    /* border: 1px solid blue; */
  }
</style>
