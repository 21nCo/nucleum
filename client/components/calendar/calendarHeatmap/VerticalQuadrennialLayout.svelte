<script lang="ts">
  import MacroIndicatorTIle from "./MacroIndicatorTIle.svelte";
  export let data: any;
  let [QD, QDData] = data;
  $: {
    [QD, QDData] = data;
  }
</script>

<div id={QD} class="quad">
  {#each QDData as yearData, index (index)}
    <MacroIndicatorTIle
      data={yearData}
      --width="4px"
      --height="0.5px"
      --direction="row"
    />
  {/each}
</div>

<style>
  .quad {
    display: grid;
    grid-auto-flow: column;
    /* grid-template-columns: repeat(4, 20px); */

    /* border: 1px solid blue; */
  }
</style>
