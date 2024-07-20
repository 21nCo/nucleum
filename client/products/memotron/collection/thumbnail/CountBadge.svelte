<script lang="ts">
  export let count: number = 0;
  export let label: string = "items";
  let fullLabel: string = count.toString() + " " + label;
  if (count > 99) fullLabel = "99+ " + label;
</script>

<span class="text-b3 text-fgs2 px-1 py-0.5 rounded-md bg-bgs3">{fullLabel}</span
>
