<script lang="ts">
  import EmptyStatusView from "@21n/ui/elements/feedback/EmptyStatusView.svelte";
  import Collection from "@nucleum/features/collections/Collection.svelte";
  import Node from "@nucleum/features/memory/node/Node.svelte";
  import Objective from "@nucleum/features/focus/goals/Goal.svelte";
  import { ResourceAccessPoint } from "@nucleum/datafn/resource.type";
  import { Resource } from "@nucleum/datafn/resource.enum";
  import type { IRecordId } from "@nucleum/schema/legacy/data.type";
  import { setContext } from "svelte";
  import { writable, type Writable } from "svelte/store";
  import { resizeListener } from "@21n/ui/actions/resize.action";
  import { Context } from "@nucleum/shared-state/app-context/app-store.type";
  import type { IContainer } from "@nucleum/shell/layout.type";
  import { setInPlaceResource } from "@nucleum/shared-state/resources/in-place-resource";

  let {
    resourceId = undefined,
    resourceType = undefined,
    onClose = undefined
  }: {
    resourceId?: IRecordId | undefined;
    resourceType?: Resource | undefined;
    /** Closes the shown item, leaving the space with no item open. */
    onClose?: (() => void) | undefined;
  } = $props();

  const container = writable<IContainer | undefined>(undefined);
  setContext<Writable<IContainer | undefined>>(Context.CONTAINER, container);
  setInPlaceResource({ onClose: () => onClose?.() });
</script>

<div
  class="relative w-full h-full"
  data-testid="space-resource-container"
  use:resizeListener={(size) => container.set(size)}
>
  {#if !resourceId || !resourceType}
    <EmptyStatusView
      mainText="Pick an item from the side nav"
      subText="Pages, collections and goals open here"
      isSearchContext={false}
    />
  {:else}
    {#each [{ id: resourceId, type: resourceType }] as item (item.id)}
      {#if item.type === Resource.node}
        <Node id={item.id} />
      {:else if item.type === Resource.collection}
        <Collection id={item.id} accessPoint={ResourceAccessPoint.SPACE} />
      {:else if item.type === Resource.objective}
        <Objective id={item.id} accessPoint={ResourceAccessPoint.SPACE} />
      {:else}
        <EmptyStatusView
          mainText="This item cannot open here"
          isSearchContext={false}
        />
      {/if}
    {/each}
  {/if}
</div>
