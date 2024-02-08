<script lang="ts">
  export let label: string;
  export let value: string | number | boolean | undefined | null;
</script>

<div class="flex gap-1 text-b2">
  <span class="font-medium">{label + ":"}</span>
  <span>{value}</span>
</div>
