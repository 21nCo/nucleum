<script lang="ts">
  import { flux } from "$lib/client/components/flux/flux";
  import type { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
  import { isSameResource } from "$lib/client/components/flux/resourceStores/resource.utils";
  import account from "$lib/client/stores/account.store";
  import { appStore } from "$lib/client/stores/app.store";
  import context from "$lib/client/stores/context.store";
  import { UserDataMode } from "$lib/client/types/account.type";
  import {
    PersistenceActionType,
    type IRecordId
  } from "$lib/client/types/data.type";
  import { createEventDispatcher, onDestroy, onMount } from "svelte";

  const dispatch = createEventDispatcher();

  /**
   * This component or page has drag and drop functionality to it. Dragging external files into the app while this component or page is active will not trigger global drag and drop catcher.
   */
  export let hasDragAndDrop = false;

  /**
   * Required for change subscriptions.
   * Works along with {@link subscribeToContext} and {@link subscribeToResource} for further filtering of change events.
   *
   * Resources to subscribe to - a change event will be dispatched if any mutation happens to these resources from anywhere else in the app so that derived or dependant stores can be reloaded or pages/components can be refreshed
   *
   */
  export let subscribeTo: Set<Resource> = new Set();

  /**
   * Context in which the change event should trigger for given {@link subscribeTo} resources
   */
  export let subscribeToContext: Set<string> | undefined = undefined;

  /**
   * change event will only trigger if the specified resource is mutated. If undefined, change event will trigger as per {@link subscribeTo} and {@link subscribeToContext}
   */
  export let subscribeToResource: IRecordId | undefined = undefined;

  /**
   * Performs sync down action on mount if the user is a cloud user and if this flag is set to true
   */
  export let syncDownOnMount = false;

  function visibilityChangeListener() {
    dispatch("appear");
  }

  onMount(() => {
    if (hasDragAndDrop) {
      $appStore.isDnDPageActive = true;
    }
    if (syncDownOnMount) {
      if ($account.dataMode !== UserDataMode.CLOUD || $context.isInOfflineMode)
        return;
      //TODO avoid duplicate syncDown if already triggered by global syncDown on appear
      flux.syncDown();
    }
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
    if (!data || !mutation || !subscribeTo.has(data.resource)) return;
    // console.log({ at: "onMutation", data, mutation });
    if (
      subscribeToResource &&
      mutation?.action === PersistenceActionType.MERGE &&
      isSameResource(mutation?.record?.id, subscribeToResource)
    ) {
      dispatch("change", data);
      return;
    }
    const excludeProperties = ["isArchived", "trashInformation"];
    const isExcludedPropertyCase =
      !subscribeToResource &&
      mutation?.action === PersistenceActionType.MERGE &&
      excludeProperties.some((x) => mutation?.record[x] !== undefined);
    if (isExcludedPropertyCase) {
      dispatch("change", data);
      return;
    }
    if (subscribeToContext && subscribeToContext.has(data.context)) {
      dispatch("change", data);
    }
  }
</script>

<svelte:window
  on:focus={visibilityChangeListener}
  on:syncDown
  on:mutation={onMutation}
/>
