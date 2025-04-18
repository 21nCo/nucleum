<script lang="ts">
  import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
  import {
    determineResourceType,
    resourceInList
  } from "$lib/client/components/flux/resourceStores/resource.utils";
  import Button from "$lib/client/elements/button/Button.svelte";
  import { ButtonStyle, ButtonVariant } from "$lib/client/types/button.type";
  import { Size } from "$lib/client/types/size.enum";
  import { formatDateRelativeToToday } from "$lib/client/utils/time.utils";
  import { focusItemsStore } from "../../session.store";
  import { createEventDispatcher } from "svelte";
  export let isHovering: boolean = false;
  export let item: any;
  $: resourceType = determineResourceType(item.id);
  const dispatch = createEventDispatcher();
  async function onAdd(e: any) {
    e.stopPropagation();
    if (resourceType === Resource.task) {
      await focusItemsStore.addTask(item.id, item.goalId);
    } else if (resourceType === Resource.goal) {
      await focusItemsStore.addGoal(item.id);
    }
    //TODO - use context to emit an event to the focus items list for refresh
  }
</script>

<div>
  {#if isHovering}
    {#if $focusItemsStore.items.some(resourceInList(item.id))}
      <span class="text-b3 text-fgs3"> Added </span>
    {:else}
      <Button
        label="Add"
        type={ButtonVariant.PRIMARY}
        style={ButtonStyle.OUTLINED}
        size={Size.sm}
        isPreventMinWidth={true}
        on:click={onAdd}
      />
    {/if}
  {:else}
    {@const startUnix = $focusItemsStore.recents?.find(
      resourceInList(item.id)
    )?.startUnix}
    {#if startUnix}
      <span class="text-b3 text-fgs3">
        Focused {formatDateRelativeToToday(startUnix)}
      </span>
    {/if}
  {/if}
</div>
