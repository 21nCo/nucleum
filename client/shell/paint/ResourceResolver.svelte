<script lang="ts">
  import { AccessMode } from "@nucleum/datafn/resource.type";
  import { isRecordId, isSameResource } from "@nucleum/datafn/resource.utils";
  import { requireActionRenderer } from "@nucleum/shared-state/resources/action-renderer";
  import { onMount } from "svelte";
  import { contextActions } from "@nucleum/shell/topNav/contextZone/context-actions";
  import {
    getContextZonePane,
    isContextZoneAccessMode
  } from "@nucleum/shell/topNav/contextZone/context-zone";

  const ComponentResolver = requireActionRenderer();
  const pane = getContextZonePane();
  let {
    id,
    isFromSplitView = false,
    componentParams = {},
    accessMode
  }: {
    id: string;
    isFromSplitView?: boolean;
    componentParams?: any;
    accessMode?: AccessMode;
  } = $props();
  let refreshId = $state<number>(new Date().getTime());
  let resolvedId = $derived(typeof id === "string" ? id : "");

  $effect(() => {
    if (!isRecordId(resolvedId) || !isContextZoneAccessMode(accessMode)) return;
    return contextActions.register(pane, {
      id: resolvedId,
      resource: resolvedId.split(":")[0],
      resolve: () => [],
      isFallback: true
    });
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
