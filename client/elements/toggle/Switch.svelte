<script lang="ts">
  import { Size } from "$lib/client/types/size.enum";
  import { generateUID } from "$lib/client/utils/utils";
  export let on = false;
  // export let label = "";
  export let id = "toggle-switch" + generateUID();
  export let size: Size = Size.md;
  export let isDisabled = false;
</script>

<label
  for={id}
  class="flex items-center {isDisabled
    ? 'cursor-not-allowed opacity-40'
    : 'cursor-pointer'}"
>
  <div class="relative">
    <input
      type="checkbox"
      {id}
      bind:checked={on}
      class="sr-only"
      disabled={isDisabled}
    />
    <div
      class={"block bg-bgs4 rounded-full" +
        (size == Size.sm ? " w-7 h-4" : " w-[48px] h-6")}
    />
    <div
      class={"dot absolute bg-bgs1 rounded-full transition" +
        (size == Size.sm
          ? " w-3 h-3 left-0.5 top-0.5"
          : " w-[22px] h-5 left-0.5 top-0.5")}
    />
  </div>
</label>

<style>
  input:checked + .block {
    background-color: rgba(var(--colors-aps1), 1);
  }
  input:checked + .block + .dot {
    transform: translateX(100%);
  }
</style>
