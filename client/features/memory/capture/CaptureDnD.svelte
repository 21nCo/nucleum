<script lang="ts">
  import type { AccessMode } from "@nucleum/datafn/resource.type";
  import Capture from "@nucleum/features/memory/capture/Capture.svelte";

  let { accessMode = undefined }: { accessMode?: AccessMode } = $props();
</script>

<Capture isWindowDnD={true} {accessMode} />
