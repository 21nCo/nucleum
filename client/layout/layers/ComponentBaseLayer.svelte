<script lang="ts">
  import { flux } from "@21n/components/flux/flux";
  import type { Resource } from "@21n/components/flux/resourceStores/resource.enum";
  import {
    isSameResource,
    resourceInList
  } from "@21n/components/flux/resourceStores/resource.utils";
  import account from "@21n/stores/account.store";
  import { appStore } from "@21n/stores/app.store";
  import context from "@21n/stores/context.store";
  import { UserDataMode } from "@21n/types/account.type";
  import {
    PersistenceActionType,
    type IRecordId
  } from "@21n/types/data.type";
  import { onDestroy, onMount } from "svelte";

  let {
    hasDragAndDrop = false,
    subscribeToResource = new Set<Resource>(),
    subscribeToRecords = undefined,
    subscribeToContext = undefined,
    subscriptionPropsForMergeAction = undefined,
    syncDownOnMount = false,
    subscribeToCacheUpdate = undefined,
    onChange = undefined,
    onAppear = undefined,
    onSyncDown = undefined
  }: {
    hasDragAndDrop?: boolean;
    subscribeToResource?: Set<Resource>;
    subscribeToRecords?: IRecordId[] | undefined;
    subscribeToContext?: Set<string> | undefined;
    subscriptionPropsForMergeAction?: string[] | undefined;
    syncDownOnMount?: boolean;
    subscribeToCacheUpdate?: string[] | undefined;
    onChange?:
      | ((
          detail:
            | { resource?: Resource; params?: any; context?: string }
            | { key: string }
        ) => void)
      | undefined;
    onAppear?: (() => void) | undefined;
    onSyncDown?: (() => void) | undefined;
  } = $props();
  const normalizedSubscribeToResource = $derived.by(() => {
    if (subscribeToResource && typeof subscribeToResource.has === "function") {
      return subscribeToResource;
    }
    if (Array.isArray(subscribeToResource)) {
      return new Set<Resource>(subscribeToResource);
    }
    return new Set<Resource>();
  });
  const normalizedSubscribeToContext = $derived.by(() => {
    if (subscribeToContext && typeof subscribeToContext.has === "function") {
      return subscribeToContext;
    }
    if (Array.isArray(subscribeToContext)) {
      return new Set<string>(subscribeToContext);
    }
    return undefined;
  });

  function visibilityChangeListener() {
    onAppear?.();
  }

  onMount(() => {
    const syncDownHandler = () => {
      onSyncDown?.();
    };
    const cacheUpdateHandler = (event: Event) => {
      onCacheUpdate(event as CustomEvent<{ key: string }>);
    };
    const mutationHandler = (event: Event) => {
      onMutation(
        event as CustomEvent<{ resource: Resource; params: any; context: string }>
      );
    };
    window.addEventListener("syncDown", syncDownHandler);
    window.addEventListener("cacheUpdate", cacheUpdateHandler);
    window.addEventListener("mutation", mutationHandler);
    if (hasDragAndDrop) {
      $appStore.isDnDPageActive = true;
    }
    if (syncDownOnMount) {
      if ($account.dataMode !== UserDataMode.CLOUD || $context.isInOfflineMode)
        return;
      flux.syncDown({ src: "ComponentBaseLayer" });
    }
    return () => {
      window.removeEventListener("syncDown", syncDownHandler);
      window.removeEventListener("cacheUpdate", cacheUpdateHandler);
      window.removeEventListener("mutation", mutationHandler);
    };
  });

  onDestroy(() => {
    if (hasDragAndDrop) {
      $appStore.isDnDPageActive = false;
    }
  });
  function onMutation(
    e: CustomEvent<{ resource: Resource; params: any; context: string }>
  ) {
    const data = e.detail;
    const mutation = data.params;
    if (!data || !mutation) return;
    const isMergeAction = [
      PersistenceActionType.MERGE,
      PersistenceActionType.BULK_MERGE
    ].includes(mutation?.action);

    if (subscribeToRecords && isMergeAction) {
      const isPresentInMerge =
        mutation?.action === PersistenceActionType.MERGE &&
        subscribeToRecords.some((x) => isSameResource(mutation?.record?.id, x));
      const isPresentInBulkMerge =
        mutation?.action === PersistenceActionType.BULK_MERGE &&
        subscribeToRecords.some((x) =>
          mutation?.recordIds?.some(resourceInList(x))
        );
      if (isPresentInMerge || isPresentInBulkMerge) {
        onChange?.(data);
      }
      return;
    }
    if (!normalizedSubscribeToResource.has(data.resource)) return;
    if (
      normalizedSubscribeToContext &&
      !normalizedSubscribeToContext.has(data.context)
    )
      return;

    if (
      (isMergeAction && subscriptionPropsForMergeAction === undefined) ||
      !isMergeAction
    ) {
      onChange?.(data);
    }
    if (
      subscriptionPropsForMergeAction &&
      subscriptionPropsForMergeAction.length === 0
    )
      return;

    const isSubscribedMergePropCase =
      subscriptionPropsForMergeAction?.some(
        (x) => mutation?.record?.[x] !== undefined
      ) ||
      subscriptionPropsForMergeAction?.some(
        (x) => mutation?.changes?.[x] !== undefined
      );
    if (isSubscribedMergePropCase) {
      onChange?.(data);
    }
  }

  function onCacheUpdate(e: CustomEvent<{ key: string }>) {
    const data = e.detail;
    if (subscribeToCacheUpdate && subscribeToCacheUpdate.includes(data.key)) {
      onChange?.(data);
    }
  }
</script>

<svelte:window onfocus={visibilityChangeListener} />
