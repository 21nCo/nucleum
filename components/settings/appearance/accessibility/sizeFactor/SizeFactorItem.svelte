<script lang="ts">
  import Element from "$lib/tidy/elements/Element.svelte";
  import { onMount } from "svelte";
  export let factor: number;
  export let isActive: boolean = false;
  let classList = "h-16 w-28 rounded-md";
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

<div class="flex flex-col items-center text-fgs2">
  <Element on:click {classList} {isActive}>Abc</Element>
  <div>{label}</div>
</div>
