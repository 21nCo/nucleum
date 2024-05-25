<script lang="ts">
  import { createEventDispatcher } from "svelte";

  export let colorPalate = ["#FFC0CB", "#FFD700", "#00FF00"];
  export let visible = false;
  export let selectedColor = "#FF0000";
  let index = colorPalate.indexOf(selectedColor);
  if (index == -1) colorPalate[0] = selectedColor;
  let dispatchEvent = createEventDispatcher();
</script>

{#each colorPalate as color, index}
  <span
    id={"colPalate" + color}
    class="inline-flex justify-center items-center rounded-full w-4 h-4 m-1"
    style="padding: 0rem;{selectedColor == color
      ? `border:1px solid ${color}`
      : ''}"
  >
    <button
      id={"colPalateButton" + color}
      on:click={() => {
        selectedColor = color;
        dispatchEvent("colorClicked", color);
        visible = false;
      }}
      class="rounded-full w-3 h-3"
      style="background-color:{color}"
    ></button></span
  >
{/each}
