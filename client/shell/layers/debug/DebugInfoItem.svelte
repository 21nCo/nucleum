<script lang="ts">
  let {
    label,
    value
  }: {
    label: string;
    value: string | number | boolean | undefined | null;
  } = $props();
</script>

<div class="flex gap-1 text-b2 w-full">
  <span class="font-medium">{label + ":"}</span>
  <span>{value}</span>
</div>
