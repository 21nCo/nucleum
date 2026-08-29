<script lang="ts">
  import { logger } from "@21n/components/debug/logger.client";
  import { Resource } from "@21n/data/datafn/resource.enum";
  import { AccessMode } from "@21n/data/datafn/resource.type";
  import {
    determineResourceType,
    isSameResource
  } from "@21n/data/datafn/resource.utils";
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
  let resolvedId = $derived(typeof id === "string" ? id : "");

  $effect(() => {
    if (accessMode === AccessMode.TAB && resolvedId) {
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
    if (resolvedId && isSameResource(resource, resolvedId)) {
      refreshId = new Date().getTime();
    }
    if (
      accessMode === AccessMode.TAB &&
      resolvedId &&
      isSameResource(resource, resolvedId)
    ) {
      setCurrentComponent();
    }
  }

  function setCurrentComponent() {
    try {
      if (accessMode !== AccessMode.TAB || !resolvedId) return;
      const resource = determineResourceType(resolvedId);
      if (!resource || resource === Resource.unknown) return;
      const action = appStore.resolveAction(resource);
      if (!action) return;
      appStore.update((s) => ({ ...s, currentComponent: action }));
    } catch (e) {
      logger.error("ResourceResolver.setCurrentComponent - error", e);
    }
  }
</script>

{#if resolvedId}
  {#key refreshId + resolvedId}
    <ComponentResolver
      path={resolvedId.split(":")[0]}
      params={{
        id: resolvedId,
        isFromSplitView,
        accessMode,
        ...componentParams
      }}
    />
  {/key}
{/if}
