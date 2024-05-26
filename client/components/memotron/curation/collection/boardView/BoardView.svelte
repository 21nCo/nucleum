<script lang="ts">
  import type { ICollectionView } from "$lib/client/types/memotron/curation.type";
  import NodeItems from "../../../common/NodeItems.svelte";
  export let view: ICollectionView;
</script>

<NodeItems nodes={view.data} arrangement={view.arrangement} />
