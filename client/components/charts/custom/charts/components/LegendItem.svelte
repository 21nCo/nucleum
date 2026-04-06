<script lang="ts">
  import { generateUID } from "@21n/utils/utils";

  let label: string;
  let checked: boolean;
  let id = generateUID();

  export { label, checked, id };
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
