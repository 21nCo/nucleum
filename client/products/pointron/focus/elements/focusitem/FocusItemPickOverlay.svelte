<script lang="ts">
  import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
  import {
    determineResourceType,
    resourceInList
  } from "$lib/client/components/flux/resourceStores/resource.utils";
  import Button from "$lib/client/elements/button/Button.svelte";
  import context from "$lib/client/stores/context.store";
  import { ButtonStyle, ButtonVariant } from "$lib/client/types/button.type";
  import { Size } from "$lib/client/types/size.enum";
  import { formatDateRelativeToToday } from "$lib/client/utils/time.utils";
  import { focusItemsStore } from "../../session.store";
  import { getContext } from "svelte";

  type FocusItemContext = {
    refreshList: () => Promise<void>;
  };

  export let isHovering: boolean = false;
  export let item: any;
  $: resourceType = determineResourceType(item.id);
  const { refreshList } = getContext<FocusItemContext>("focus-item-context");

  async function onAdd(e: any) {
    e.stopPropagation();
    if (resourceType === Resource.task) {
      await focusItemsStore.addTask(item.id, item.goalId);
    } else if (resourceType === Resource.goal) {
      await focusItemsStore.addGoal(item.id);
    }
    refreshList();
  }
</script>

<div class="flex items-center gap-2 px-2">
  {#if isHovering || $context.isTouchDevice}
    {#if $focusItemsStore.items.some(resourceInList(item.id))}
      <span class="text-b3 text-fgs3"> Added </span>
    {:else}
      <Button
        label="Add"
        icon="ph:plus-light"
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
    <span class="text-b3 text-fgs3">
      {#if $focusItemsStore.items.some(resourceInList(item.id))}
        Added
      {:else if startUnix}
        Focused {formatDateRelativeToToday(startUnix)}
      {/if}
    </span>
  {/if}
</div>
