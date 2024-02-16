<script>
  import { generateUID } from "$lib/tidy/utils/utils";

  export let checked = false;
  export let label = "";
  export let id = "toggle-switch" + generateUID();

  function toggle() {
    checked = !checked;
  }
</script>

<label for={id} class="flex items-center cursor-pointer">
  <div class="relative">
    <input type="checkbox" {id} {checked} class="sr-only" on:change={toggle} />
    <div class="block bg-fgs4 w-14 h-8 rounded-full" />
    <div
      class="dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition"
    />
  </div>
  <div class="ml-3 text-gray-700 font-medium">{label}</div>
</label>

<style>
  input:checked + .block {
    background-color: rgba(var(--colors-a1), 1);
  }
  input:checked + .block + .dot {
    transform: translateX(100%);
  }
</style>
