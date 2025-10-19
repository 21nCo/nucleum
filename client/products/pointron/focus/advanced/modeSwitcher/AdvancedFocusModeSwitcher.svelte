<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import SwitcherItem from "@21n/products/pointron/focus/advanced/modeSwitcher/SwitcherItem.svelte";
  const dispatch = createEventDispatcher();
  export let selectedMode: number;
  function switchMode(mode: number) {
    dispatch("switch", { selected: mode });
  }
</script>

<div class="flex w-full justify-center gap-12">
  <SwitcherItem
    mode={0}
    isActive={selectedMode === 0}
    on:click={() => switchMode(0)}
  />
  <SwitcherItem
    mode={1}
    isActive={selectedMode === 1}
    on:click={() => switchMode(1)}
  />
</div>
