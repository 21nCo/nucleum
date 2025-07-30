<script lang="ts">
  import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
  import { ResourceAccessMode } from "$lib/client/components/flux/resourceStores/resource.type";
  import {
    determineResourceType,
    resourceInList
  } from "$lib/client/components/flux/resourceStores/resource.utils";
  import Button from "$lib/client/elements/button/Button.svelte";
  import Icon from "$lib/client/elements/Icon.svelte";
  import { appStore, isInEditMode } from "$lib/client/stores/app.store";
  import context from "$lib/client/stores/context.store";
  import { ButtonStyle, ButtonVariant } from "$lib/client/types/button.type";
  import { Size } from "$lib/client/types/size.enum";
  import { formatDateRelativeToToday } from "$lib/client/utils/time.utils";
  import {
    activeSession,
    currentFocusItem,
    focusItemsStore
  } from "../../session.store";
  import { getContext } from "svelte";

  type FocusItemContext = {
    refreshList: () => Promise<void>;
  };

  export let isHovering: boolean = false;
  export let item: any;
  $: resourceType = determineResourceType(item.id);
  const { refreshList } = getContext<FocusItemContext>("focus-item-context");

  $: isAdded = $focusItemsStore.items.some(resourceInList(item.id));

  $: isInprogress = activeSession.isCurrentFocusItem(
    item.id,
    $currentFocusItem
  );

  async function onAdd(e: any) {
    e.stopPropagation();
    if (resourceType === Resource.task) {
      await focusItemsStore.addTask(item.id, item.goalId);
    } else if (resourceType === Resource.goal) {
      await focusItemsStore.addGoal(item.id);
    }
    refreshList();
  }

  async function onStartFocusing(e: any) {
    e.stopPropagation();
    if (resourceType === Resource.task) {
      await activeSession.focusTask(item.id, item.goalId);
    } else if (resourceType === Resource.goal) {
      await activeSession.focusGoal(item.id);
    }
    isInEditMode.toggle(false);
    refreshList();
  }
</script>

{#if !isInprogress}
  <div class="flex items-center gap-2 px-2 absolute inset-y-0 right-0 bg-bgs2">
    {#if isHovering || $context.isTouchDevice}
      {#if resourceType === Resource.task && !$context.isTouchDevice}
        <Button
          icon="pop"
          tooltip="Open task"
          size={Size.sm}
          style={ButtonStyle.OUTLINED}
          parentBgIndex={2}
          on:click={() => {
            appStore.openResource(item.id, ResourceAccessMode.POP);
          }}
        />
      {/if}
      {#if isAdded}
        <span class="text-b3 text-fgs3"> Added </span>
      {:else}
        <Button
          icon="circle"
          tooltip="Start focusing"
          style={ButtonStyle.OUTLINED}
          size={Size.sm}
          on:click={onStartFocusing}
        />
        <Button
          icon="plus"
          tooltip="Add to focus items"
          type={ButtonVariant.PRIMARY}
          style={ButtonStyle.OUTLINED}
          size={Size.sm}
          on:click={onAdd}
        />
      {/if}
    {:else}
      {@const startUnix = $focusItemsStore.recents?.find(
        resourceInList(item.id)
      )?.startUnix}
      <span class="text-b3 text-fgs3 userdata">
        {#if isAdded}
          <div class="flex gap-1 items-center">
            <Icon icon="check-circle" isFilled={true} size={Size.sm} />
            <span> Added to focus items </span>
          </div>
        {:else if startUnix}
          Focused {formatDateRelativeToToday(startUnix)?.toLowerCase()}
        {/if}
      </span>
    {/if}
  </div>
{:else if resourceType === Resource.task && !$context.isTouchDevice && isHovering}
  <Button
    icon="pop"
    tooltip="Open task"
    size={Size.sm}
    style={ButtonStyle.OUTLINED}
    parentBgIndex={2}
    on:click={() => {
      appStore.openResource(item.id, ResourceAccessMode.POP);
    }}
  />
{/if}
