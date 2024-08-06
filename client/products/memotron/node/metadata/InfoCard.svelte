<script lang="ts">
  export let label: string;
  export let value: string | number | undefined;
</script>

<div
  class="flex flex-col items-start gap-1 w-2/5 grow rounded-md bg-bgs2 mo:p-2 p-3"
>
  <span class="text-fgs1 text-base font-medium">{value ?? "NA"}</span>
  <span class="text-fgs3 text-b3">{label}</span>
</div>
