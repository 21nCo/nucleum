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
  import { createEventDispatcher, onDestroy, onMount } from "svelte";

  const dispatch = createEventDispatcher();

  /**
   * This component or page has drag and drop functionality to it. Dragging external files into the app while this component or page is active will not trigger global drag and drop catcher.
   */
  export let hasDragAndDrop = false;

  /**
   * Required for change subscriptions.
   * Works along with {@link subscribeToContext} for further filtering of change events.
   *
   * Resources to subscribe to - a change event will be dispatched if any mutation happens to these resources from anywhere else in the app so that derived or dependant stores can be reloaded or pages/components can be refreshed
   *
   */
  export let subscribeToResource: Set<Resource> = new Set();

  /**
   * Change event will only trigger if the specified record is mutated. If undefined, change event will trigger as per {@link subscribeToResource} and {@link subscribeToContext} combination. {@link subscribeToResource} is not required if this is set.
   * Note: only Merge actions will be triggered for record based subscriptions
   */
  export let subscribeToRecords: IRecordId[] | undefined = undefined;

  /**
   * Context in which the change event should trigger for given {@link subscribeToResource} resources. If not set, change event will trigger for all contexts for the given resources.
   */
  export let subscribeToContext: Set<string> | undefined = undefined;

  /**
   * If set, only the properties in this array will be subscribed to for merge action. If empty array is passed, Merge action will not be subscribed to. If not set, merge action will be subscribed to all properties.
   */
  export let subscriptionPropsForMergeAction: string[] | undefined = undefined;

  /**
   * Performs sync down action on mount if the user is a cloud user and if this flag is set to true
   */
  export let syncDownOnMount = false;

  /**
   * If set, the change event will be dispatched if the cache update event is triggered for the given key
   */
  export let subscribeToCacheUpdate: string[] | undefined = undefined;

  function visibilityChangeListener() {
    dispatch("appear");
  }

  onMount(() => {
    const syncDownHandler = () => {
      dispatch("syncDown");
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
      //TODO avoid duplicate syncDown if already triggered by global syncDown on appear
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
  /**
   *
   * @param e
   */
  function onMutation(
    e: CustomEvent<{ resource: Resource; params: any; context: string }>
  ) {
    const data = e.detail;
    const mutation = data.params;
    if (!data || !mutation) return;
    //console.log({ at: "onMutation", data, mutation });

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
        dispatch("change", data);
      }
      return;
    }
    if (!subscribeToResource.has(data.resource)) return;
    if (subscribeToContext && !subscribeToContext.has(data.context)) return;

    if (
      (isMergeAction && subscriptionPropsForMergeAction === undefined) ||
      !isMergeAction
    ) {
      dispatch("change", data);
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
      dispatch("change", data);
    }
  }

  function onCacheUpdate(e: CustomEvent<{ key: string }>) {
    const data = e.detail;
    if (subscribeToCacheUpdate && subscribeToCacheUpdate.includes(data.key)) {
      dispatch("change", data);
    }
  }
</script>

<svelte:window on:focus={visibilityChangeListener} />
