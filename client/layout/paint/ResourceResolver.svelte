<script lang="ts">
  import { logger } from "$lib/client/components/debug/logger.client";
  import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
  import { ResourceAccessMode } from "$lib/client/components/flux/resourceStores/resource.type";
  import {
    determineResourceType,
    isSameResource
  } from "$lib/client/components/flux/resourceStores/resource.utils";
  import { appStore } from "$lib/client/stores/app.store";
  import ComponentResolver from "./ComponentResolver.svelte";
  export let id: string;
  export let isFromSplitView: boolean = false;
  export let componentParams: any = {};
  export let accessMode: ResourceAccessMode = ResourceAccessMode.INLINE;
  let refreshId: number = new Date().getTime();
  setCurrentComponent();

  function onReloadResource(e: CustomEvent) {
    const resource = e?.detail?.id;
    if (!resource) return;
    if (isSameResource(resource, id)) {
      refreshId = new Date().getTime();
    }
    setCurrentComponent();
  }

  function setCurrentComponent() {
    try {
      if (accessMode !== ResourceAccessMode.TAB) return;
      const resource = determineResourceType(id);
      if (!resource || resource === Resource.unknown) return;
      const action = appStore.resolveAction(resource);
      if (!action) return;
      $appStore.currentComponent = action;
    } catch (e) {
      logger.error("ResourceResolver.setCurrentComponent - error", e);
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
