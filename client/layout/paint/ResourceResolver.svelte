<script lang="ts">
  import { logger } from "@21n/components/debug/logger.client";
  import { Resource } from "@21n/components/flux/resourceStores/resource.enum";
  import { ResourceAccessMode } from "@21n/components/flux/resourceStores/resource.type";
  import {
    determineResourceType,
    isSameResource
  } from "@21n/components/flux/resourceStores/resource.utils";
  import { appStore } from "@21n/stores/app.store";
  import ComponentResolver from "@21n/layout/paint/ComponentResolver.svelte";
  export let id: string;
  export let isFromSplitView: boolean = false;
  export let componentParams: any = {};
  export let accessMode: ResourceAccessMode = ResourceAccessMode.INLINE;
  let refreshId: number = new Date().getTime();

  $: if (accessMode === ResourceAccessMode.TAB && id) setCurrentComponent();

  function onReloadResource(e: CustomEvent) {
    const resource = e?.detail?.id;
    if (!resource) return;
    if (isSameResource(resource, id)) {
      refreshId = new Date().getTime();
    }
    if (accessMode === ResourceAccessMode.TAB && isSameResource(resource, id)) {
      setCurrentComponent();
    }
  }

  function setCurrentComponent() {
    try {
      if (accessMode !== ResourceAccessMode.TAB) return;
      const resource = determineResourceType(id);
      if (!resource || resource === Resource.unknown) return;
      const action = appStore.resolveAction(resource);
      if (!action) return;
      appStore.update(s => ({ ...s, currentComponent: action }));
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
