<script lang="ts">
  import type { YearlyData } from "$lib/tidy/types/CalendarHeatMapData.type";
  import { onMount } from "svelte";
  export let data: YearlyData;
  export let tileValue: string = "";
  $: if (tileValue == "") {
    tileValue = String(data.year);
  }
</script>

<span>
  <button id="MaITile">
    <!--on:click dispatch required event along with data/data.year available here-->
    {tileValue ?? ""}
  </button>
</span>

<style>
  button {
    color: var(--colors-fg-s2, #545454);
    font-size: 14px;
    font-weight: 350;
    text-align: center;
    height: 35px;
    width: 85px;
    padding: 8px 10px;
    background-color: var(--tileBgColor);
    border-radius: 3px;
    /* border: 1px solid red; */
  }
  span {
    display: flex;
    flex-direction: var(--direction, column);
    justify-self: center;
    align-items: center;
    /* border: 1px solid red; */
  }
  span::before {
    content: "";
    width: var(--width, 0.5px);
    height: var(--height, 4.5px);
    background-color: var(--topThreadColor, inherit);
    /* transform: translate(6px, 0px); */
  }
  span::after {
    content: "";
    width: var(--width, 0.5px);
    height: var(--height, 4.5px);
    background-color: var(--bottomThreadColor, inherit);
    /* transform: translate(6px, 0px); */
  }
</style>
