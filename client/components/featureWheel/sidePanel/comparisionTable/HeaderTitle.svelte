<script lang="ts">
  import Icon from "$lib/client/elements/Icon.svelte";
  import { Size } from "$lib/client/types/size.enum";

  export let icon: string;
  export let label: string;
</script>

<th class="border border-bgs3 p-2 text-left">
  <div class="flex items-center gap-1">
    <Icon {icon} size={Size.sm} />
    <span class="font-light">{label}</span>
  </div>
</th>
