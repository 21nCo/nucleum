<script lang="ts">
  import { Size } from "$lib/tidy/types/size.enum";
  import { generateUID } from "$lib/tidy/utils/utils";
  export let on = false;
  export let label = "";
  export let id = "toggle-switch" + generateUID();
  export let size: Size.sm | Size.lg = Size.lg;
  function toggle() {
    on = !on;
  }
</script>

<label for={id} class="flex items-center cursor-pointer">
  <div class="relative">
    <input
      type="checkbox"
      {id}
      checked={on}
      class="sr-only"
      on:change={toggle}
    />
    <div
      class={"block bg-bgs4 rounded-full" +
        (size == Size.sm ? " w-7 h-4" : " w-14 h-8")}
    />
    <div
      class={"dot absolute bg-fgs1 rounded-full transition" +
        (size == Size.sm
          ? " w-3 h-3 left-0.5 top-0.5"
          : " w-6 h-6 left-1 top-1")}
    />
  </div>
  <div class="ml-3 text-fgs2 font-medium">{label}</div>
</label>

<style>
  input:checked + .block {
    background-color: rgba(var(--colors-aps1), 1);
  }
  input:checked + .block + .dot {
    transform: translateX(100%);
  }
</style>
