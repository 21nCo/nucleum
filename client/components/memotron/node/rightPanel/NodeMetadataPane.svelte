<script lang="ts">
  import ComingSoonView from "$lib/client/elements/ComingSoonView.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import { resolveActiveNodeStore } from "../node.store";
  export let id: string;
  const node = resolveActiveNodeStore(id);
</script>

<div class="w-full h-full">
  <ComingSoonView size={Size.sm} subText="coming soon..." />
</div>
