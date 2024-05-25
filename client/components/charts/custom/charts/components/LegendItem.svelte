<script lang="ts">
  import { generateUID } from "$lib/client/utils/utils";

  export let label: string;
  export let checked: boolean;
  export let id = generateUID();
</script>

<div class="flex gap-1 items-center justify-center">
  <input
    class="w-[10px] h-[10px] cursor-pointer p-1"
    {id}
    type="checkbox"
    bind:checked
  />
  <label class="text-b5 cursor-pointer p-[2px]" for={id}>{label}</label>
</div>
