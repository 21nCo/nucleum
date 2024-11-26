<script lang="ts">
  import { ResourceAccessMode } from "$lib/client/components/flux/resourceStores/resource.type";
  import { isSameResource } from "$lib/client/components/flux/resourceStores/resource.utils";
  import ComponentResolver from "./ComponentResolver.svelte";
  export let id: string;
  export let isFromSplitView: boolean = false;
  export let componentParams: any = {};
  export let accessMode: ResourceAccessMode = ResourceAccessMode.INLINE;
  let refreshId: number = new Date().getTime();
  function onReloadResource(e: CustomEvent) {
    const resource = e?.detail?.id;
    if (!resource) return;
    if (isSameResource(resource, id)) {
      refreshId = new Date().getTime();
    }
  }
</script>

{#key refreshId}
  <ComponentResolver
    path={id.split(":")[0]}
    params={{ id, isFromSplitView, accessMode, ...componentParams }}
  />
{/key}

<svelte:window on:reloadResource={onReloadResource} />
