<script lang="ts">
  import { onMount } from "svelte";
  export let factor: number;
  export let isActive: boolean = false;
  export let parentBackgroundIndex: number = 1;
  let classList = "h-16 w-28 rounded-md ";
  let label: string = "";
  onMount(() => {
    if (factor === 0) {
      classList += " text-b2";
      label = "smaller";
    } else if (factor === 1) {
      classList += " text-base";
      label = "default";
    } else if (factor === 2) {
      classList += " text-h3";
      label = "larger";
    }
  });
</script>

<div class="flex flex-col gap-1 items-center">
  <button
    on:click
    class={classList + (isActive ? " bg-aps1 text-bgs1" : " bg-bgs2 text-fgs3")}
    >Abc</button
  >
  <div class={isActive ? "text-aps1" : "text-fgs3"}>{label}</div>
</div>
