<script lang="ts">
  import { ResourceAccessMode } from "$lib/client/components/resourceStores/resource.type";
  import ComponentResolver from "./ComponentResolver.svelte";
  export let id: string;
  export let isFromSplitView: boolean = false;
  export let componentParams: any = {};
  export let accessMode: ResourceAccessMode = ResourceAccessMode.INLINE;
</script>

<ComponentResolver
  path={id.split(":")[0]}
  params={{ id, isFromSplitView, accessMode, ...componentParams }}
/>
