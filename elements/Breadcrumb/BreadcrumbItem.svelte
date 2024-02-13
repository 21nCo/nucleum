<script lang="ts">
  import { windowObject } from "$lib/tidy/stores/app.store";

  export let label: string = "";
  export let path: string = "";
  export let isDisabled: boolean = false;

  function handleClick() {
    windowObject.gotoPath(path);
  }
  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === "Enter") {
      handleClick();
    }
  }
</script>

<div class="flex items-center justify-center w-fit mr-2 whitespace-nowrap">
  <div class="triangle bg-fgs2 w-[8px] h-[7px] mr-1" />
  <p
    on:click={handleClick}
    on:keydown={handleKeyDown}
    class={`text-fgs2 text-b2 font-thin ${isDisabled ? `opacity-50` : ``} ${
      path === "" ? `cursor-default` : `cursor-pointer`
    }`}
  >
    {label}
  </p>
</div>

<style>
  .triangle {
    clip-path: polygon(0% 50%, 100% 0%, 100% 100%);
  }
</style>
