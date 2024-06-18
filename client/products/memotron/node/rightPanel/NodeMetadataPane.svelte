<script lang="ts">
  import ComingSoonView from "$lib/client/elements/ComingSoonView.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import type { IActiveNodeStore } from "../node.store";
  export let node: IActiveNodeStore;
</script>

<div class="w-full h-full">
  <ComingSoonView size={Size.sm} subText="coming soon..." />
</div>
