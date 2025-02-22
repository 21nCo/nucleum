<script lang="ts">
  import {
    resolveTaskContextMenu,
    type IActiveTaskStore
  } from "$lib/client/components/tasks/task.store";
  import Breadcrumbs from "$lib/client/elements/breadcrumbsV2/Breadcrumbs.svelte";
  import Button from "$lib/client/elements/button/Button.svelte";
  import ColorPickerMini from "$lib/client/elements/colorPicker/ColorPickerMini.svelte";
  import ContextMenuAction from "$lib/client/elements/contextMenu/ContextMenuAction.svelte";
  import TextInput from "$lib/client/elements/input/TextInput.svelte";
  import { appStore } from "$lib/client/stores/app.store";
  import { Placement } from "$lib/client/types/direction.enum";
  import { Size } from "$lib/client/types/size.enum";
  import { cn } from "$lib/client/utils/ui.utils";
  import { isValidArrayWithData } from "$lib/shared/utils/obj.utils";
  import { ResourceAccessPoint } from "../../flux/resourceStores/resource.type";
  import RecordStarStatusFeedback from "../../record/RecordStarStatusFeedback.svelte";
  export let task: IActiveTaskStore;
  export let isConstrainedWidth = false;
  let labelEditVal = $task.label;
  function resolveBreadcrumbs() {
    const parentItems = $task.parent?.map((p) => ({
      label: p.label,
      resourceId: p.id?.toString()
    }));
    if (parentItems && parentItems.length > 0) {
      parentItems.push({
        label: $task.label,
        resourceId: $task.id?.toString()
      });
    }
    return parentItems;
  }

  function handleLabelChange(e: CustomEvent<string>) {
    task.modify({
      label: e.detail
    });
  }

  function handleColorChange(e: number | string) {
    task.modify({
      color: +e
    });
  }

  function handleLabelSave(e: any) {
    $task.label = labelEditVal;
    task.modify({
      label: labelEditVal
    });
    labelEditVal = "";
    $task.isInEditMode = false;
  }
</script>

<div
  class={cn("flex flex-col items-center gap-1", {
    "px-3 lp:px-6 pt-2": isConstrainedWidth
  })}
>
  <!-- <Icon icon={resolveTaskTypeIcon($task.type)} class="text-fgs3" /> -->
  <Breadcrumbs items={resolveBreadcrumbs()} />
  <div class="w-full flex items-center justify-between gap-1">
    {#if $task.isInEditMode}
      <div class="flex items-center gap-2 flex-1">
        <span class="flex-1">
          <TextInput
            bind:value={labelEditVal}
            placeholder="Enter task name"
            width="w-full"
            isShowSaveControl={true}
            parentBackgroundIndex={2}
            on:debouncedChange={handleLabelChange}
            on:save={handleLabelSave}
            on:cancel={() => {
              $task.isInEditMode = false;
              labelEditVal = "";
            }}
          />
        </span>
        {#if !isValidArrayWithData($task.parent)}
          <ColorPickerMini
            bind:hue={$task.color}
            onDebouncedChangeCallback={handleColorChange}
          />
        {/if}
      </div>
    {:else}
      <button
        class="flex-1"
        on:click={() => {
          $task.isInEditMode = true;
          labelEditVal = $task.label;
        }}
      >
        <div class="flex items-center gap-2 w-full">
          <h1 class="text-left text-h4 lp:text-h3 font-medium text-ccs1">
            {$task.label}
          </h1>
          <RecordStarStatusFeedback isStarred={$task.isStarred} />
        </div>
      </button>
    {/if}
    <ContextMenuAction
      menuResolver={() =>
        resolveTaskContextMenu($task, ResourceAccessPoint.SELF)}
      position={Placement.BottomCenter}
      id="taskContextMenu"
      size={Size.lg}
      icon={isConstrainedWidth ? "ph:dots-three-outline-light" : undefined}
      actionBgSize={isConstrainedWidth ? Size.sm : undefined}
    />
    {#if isConstrainedWidth}
      <Button
        icon="ph:x-light"
        parentBgIndex={2}
        on:click={() => {
          appStore.goBack();
        }}
      />
    {/if}
  </div>
</div>
