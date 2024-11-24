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
   * Resources to subscribe to - a change event will be dispatched if any mutation happens to these resources from anywhere else in the app so that derived or dependant stores can be reloaded or pages/components can be refreshed
   */
  export let subscribeTo: Set<Resource> = new Set();

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
   * TODO - detect resources that have been mutated and dispatch a change event if subscribed to
   * @param e
   */
  function onMutation(
    e: CustomEvent<{ resource: Resource; params: any; context: string }>
  ) {
    const data = e.detail;
    if (
      data &&
      subscribeTo.has(data.resource) &&
      ((subscribeToContext && subscribeToContext.has(data.context)) ||
        !subscribeToContext) &&
      ((subscribeToResource &&
        data.params?.action === PersistenceActionType.MERGE &&
        isSameResource(data.params?.record?.id, subscribeToResource)) ||
        !subscribeToResource)
    ) {
      dispatch("change", data);
    }
  }
</script>

<svelte:window
  on:focus={visibilityChangeListener}
  on:syncDown
  on:mutation={onMutation}
/>
