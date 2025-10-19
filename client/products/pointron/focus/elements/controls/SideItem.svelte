<script lang="ts">
  import Icon from "@21n/elements/Icon.svelte";
  import { Size } from "@21n/types/size.enum";
  import { createEventDispatcher } from "svelte";
  const dispatch = createEventDispatcher();
  export let item: string;
  export let size: Size = Size.lg;
  let isActive: boolean = false;
  function clickHandler() {
    isActive = !isActive;
    dispatch("click", { item });
  }
</script>

<button
  class="outline outline-a1 rounded-full flex justify-center items-center {isActive
    ? 'bg-aps1'
    : 'bg-none'} {size === Size.lg
    ? 'w-16 h-16'
    : size === Size.md
      ? 'w-12 h-12'
      : 'w-12 h-12'}"
  on:click={clickHandler}
>
  <Icon icon={item} {size} {isActive} />
</button>
