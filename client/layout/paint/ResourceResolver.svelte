<script lang="ts">
  import { logger } from "@21n/components/debug/logger.client";
  import { Resource } from "@21n/components/flux/resourceStores/resource.enum";
  import { AccessMode } from "@21n/components/flux/resourceStores/resource.type";
  import {
    determineResourceType,
    isSameResource
  } from "@21n/components/flux/resourceStores/resource.utils";
  import { appStore } from "@21n/stores/app.store";
  import ComponentResolver from "@21n/layout/paint/ComponentResolver.svelte";
  import { onMount } from "svelte";
  let {
    id,
    isFromSplitView = false,
    componentParams = {},
    accessMode = AccessMode.INLINE
  }: {
    id: string;
    isFromSplitView?: boolean;
    componentParams?: any;
    accessMode?: AccessMode;
  } = $props();
  let refreshId = $state<number>(new Date().getTime());

  $effect(() => {
    if (accessMode === AccessMode.TAB && id) {
      setCurrentComponent();
    }
  });

  onMount(() => {
    const reloadResourceHandler: EventListener = (event) => {
      onReloadResource(event as CustomEvent<{ id: string }>);
    };
    window.addEventListener("reloadResource", reloadResourceHandler);
    return () => {
      window.removeEventListener("reloadResource", reloadResourceHandler);
    };
  });

  function onReloadResource(e: CustomEvent) {
    const resource = e?.detail?.id;
    if (!resource) return;
    if (isSameResource(resource, id)) {
      refreshId = new Date().getTime();
    }
    if (accessMode === AccessMode.TAB && isSameResource(resource, id)) {
      setCurrentComponent();
    }
  }

  function setCurrentComponent() {
    try {
      if (accessMode !== AccessMode.TAB) return;
      const resource = determineResourceType(id);
      if (!resource || resource === Resource.unknown) return;
      const action = appStore.resolveAction(resource);
      if (!action) return;
      appStore.update((s) => ({ ...s, currentComponent: action }));
    } catch (e) {
      logger.error("ResourceResolver.setCurrentComponent - error", e);
    }
  }
</script>

{#key refreshId + id}
  <ComponentResolver
    path={id.split(":")[0]}
    params={{ id, isFromSplitView, accessMode, ...componentParams }}
  />
{/key}
