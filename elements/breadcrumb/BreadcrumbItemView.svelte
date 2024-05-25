<script lang="ts">
  import { appStore } from "$lib/tidy/stores/app.store";
  export let label: string = "";
  export let path: string = "";
  export let isDisabled: boolean = false;
  export let isLast: boolean = false;

  function handleClick() {
    appStore.gotoPath(path);
  }
  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === "Enter") {
      handleClick();
    }
  }
</script>

<div class="flex items-center justify-center w-fit whitespace-nowrap text-fgs3">
  <!-- <div class="triangle bg-fgs2 w-[8px] h-[7px] mr-1" /> -->
  <p
    on:click={handleClick}
    on:keydown={handleKeyDown}
    id="breadcrumb-item-label"
    class="text-b2 font-thin {isDisabled ? `opacity-50` : ``} {path === ''
      ? `cursor-default`
      : `cursor-pointer`} {isLast ? 'isLast' : 'isNotLast'}"
  >
    {label}
  </p>
  {#if !isLast}
    <div class="px-2 opacity-50">/</div>
  {/if}
</div>

<style>
  .triangle {
    clip-path: polygon(0% 50%, 100% 0%, 100% 100%);
  }
  #breadcrumb-item-label:hover.isNotLast {
    /* color: var(--customcolor); */
    text-decoration: underline;
  }
  #breadcrumb-item-label.isLast {
    color: var(--customcolor);
  }
</style>
