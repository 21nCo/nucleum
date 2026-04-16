<script lang="ts">
  import Icon from "@21n/elements/Icon.svelte";
  import { Size } from "@21n/types/size.enum";

  let { icon, label }: { icon: string; label: string } = $props();
  const resolvedLabel = $derived(
    label === "sourcingType" ? "Source code" : label
  );
</script>

<th class="border border-brs3 p-2 text-left">
  <div class="flex items-center gap-1">
    <Icon {icon} size={Size.sm} />
    <span class="font-light">{resolvedLabel}</span>
  </div>
</th>
