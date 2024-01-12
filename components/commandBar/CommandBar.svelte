<script lang="ts">
  import { onMount } from "svelte";
  import Results from "./Results.svelte";
  let value: string = "";
  let inputRef: HTMLInputElement;
  let resultsRef: any;
  onMount(() => {
    inputRef?.focus();
  });
  function handleKeyUp(event: any) {
    if (event.key === "ArrowDown") {
      resultsRef.moveSelection("down");
    } else if (event.key === "ArrowUp") {
      resultsRef.moveSelection("up");
    } else if (event.key === "Enter") {
      resultsRef.select();
    }
  }
</script>

<div class="flex flex-col h-full">
  <div class="flex w-full bg-bgs2 justify-between items-center">
    <input
      bind:this={inputRef}
      type="text"
      bind:value
      on:keyup={handleKeyUp}
      class="h-[3.6rem] bg-transparent px-4 grow focus:border-none focus:outline-none text-h5"
      placeholder="Run a command or type / to see list of all commands"
    />
    <div class="mr-4">
      <div
        class="px-2 bg-bgs3 rounded-md py-1 text-b3 text-fgs3 min-w-fit w-fit"
      >
        {#if value}
          Press <b>Enter</b> to run
        {:else}
          Cmd bar
        {/if}
      </div>
    </div>
  </div>
  <div class="flex-grow">
    <Results search={value} bind:this={resultsRef} />
  </div>
  <div
    class="flex w-full h-8 min-h-[2rem] bg-bgs2 justify-between items-center text-b3 text-fgs3 px-4"
  >
    <span> Press <b>Esc</b> to close </span>
    <span> Cmd + K </span>
  </div>
</div>
