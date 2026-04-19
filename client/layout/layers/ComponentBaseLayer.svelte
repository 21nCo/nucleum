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

  function isCallable<T extends (...args: any[]) => any>(
    value: unknown
  ): value is T {
    return typeof value === "function";
  }

  function emitChange(
    detail:
      | { resource?: Resource; params?: any; context?: string }
      | { key: string }
  ) {
    if (isCallable(onChange)) onChange(detail);
  }

  function isComparableRecord(value: unknown): value is IRecordId | { id: IRecordId } {
    return (
      typeof value === "string" ||
      (typeof value === "object" &&
        value !== null &&
        ("id" in value || "tb" in value))
    );
  }

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
    if (typeof subscribeToContext === "string") {
      return new Set<string>([subscribeToContext]);
    }
    return undefined;
  });
  const normalizedSubscribeToRecords = $derived.by(() => {
    if (Array.isArray(subscribeToRecords)) {
      return subscribeToRecords.filter(isComparableRecord);
    }
    if (typeof subscribeToRecords === "string") return [subscribeToRecords];
    if (
      subscribeToRecords &&
      typeof subscribeToRecords[Symbol.iterator] === "function"
    ) {
      return Array.from(subscribeToRecords as Iterable<IRecordId>).filter(
        isComparableRecord
      );
    }
    if (isComparableRecord(subscribeToRecords)) return [subscribeToRecords];
    return [] as IRecordId[];
  });
  const normalizedSubscriptionPropsForMergeAction = $derived.by(() => {
    if (subscriptionPropsForMergeAction === undefined) return undefined;
    if (Array.isArray(subscriptionPropsForMergeAction)) {
      return subscriptionPropsForMergeAction;
    }
    if (typeof subscriptionPropsForMergeAction === "string") {
      return [subscriptionPropsForMergeAction];
    }
    if (
      subscriptionPropsForMergeAction &&
      typeof subscriptionPropsForMergeAction[Symbol.iterator] === "function"
    ) {
      return Array.from(subscriptionPropsForMergeAction as Iterable<string>);
    }
    return [subscriptionPropsForMergeAction];
  });
  const normalizedSubscribeToCacheUpdate = $derived.by(() => {
    if (!subscribeToCacheUpdate) return [] as string[];
    if (Array.isArray(subscribeToCacheUpdate)) return subscribeToCacheUpdate;
    if (typeof subscribeToCacheUpdate === "string") {
      return [subscribeToCacheUpdate];
    }
    if (typeof subscribeToCacheUpdate[Symbol.iterator] === "function") {
      return Array.from(subscribeToCacheUpdate as Iterable<string>);
    }
    return [subscribeToCacheUpdate];
  });

  function visibilityChangeListener() {
    if (isCallable(onAppear)) onAppear();
  }

  onMount(() => {
    const syncDownHandler = () => {
      if (isCallable(onSyncDown)) onSyncDown();
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

    if (normalizedSubscribeToRecords.length > 0 && isMergeAction) {
      const isPresentInMerge =
        mutation?.action === PersistenceActionType.MERGE &&
        normalizedSubscribeToRecords.some((x) =>
          isSameResource(mutation?.record?.id, x)
        );
      const isPresentInBulkMerge =
        mutation?.action === PersistenceActionType.BULK_MERGE &&
        normalizedSubscribeToRecords.some((x) =>
          mutation?.recordIds?.some(resourceInList(x))
        );
      if (isPresentInMerge || isPresentInBulkMerge) {
        emitChange(data);
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
      (isMergeAction && normalizedSubscriptionPropsForMergeAction === undefined) ||
      !isMergeAction
    ) {
      emitChange(data);
    }
    if (
      normalizedSubscriptionPropsForMergeAction &&
      normalizedSubscriptionPropsForMergeAction.length === 0
    )
      return;

    const isSubscribedMergePropCase =
      normalizedSubscriptionPropsForMergeAction?.some(
        (x) => mutation?.record?.[x] !== undefined
      ) ||
      normalizedSubscriptionPropsForMergeAction?.some(
        (x) => mutation?.changes?.[x] !== undefined
      );
    if (isSubscribedMergePropCase) {
      emitChange(data);
    }
  }

  function onCacheUpdate(e: CustomEvent<{ key: string }>) {
    const data = e.detail;
    if (
      normalizedSubscribeToCacheUpdate.length > 0 &&
      normalizedSubscribeToCacheUpdate.includes(data.key)
    ) {
      emitChange(data);
    }
  }
</script>

<svelte:window onfocus={visibilityChangeListener} />
