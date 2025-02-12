<script lang="ts">
  import Button from "$lib/client/elements/button/Button.svelte";
  import DatePicker from "$lib/client/elements/datetime/DatePicker.svelte";
  import TextInput from "$lib/client/elements/input/TextInput.svelte";
  import OptionSelector from "$lib/client/elements/select/OptionSelector.svelte";
  import LinkboxOnCapture from "$lib/client/products/memotron/common/linkbox/LinkboxOnCapture.svelte";
  import { ButtonStyle } from "$lib/client/types/button.type";
  import { Orientation } from "$lib/client/types/direction.enum";
  import { InputStyle } from "$lib/client/types/input.type";
  import { OptionSelectorStyle } from "$lib/client/types/select.type";
  import { Size } from "$lib/client/types/size.enum";
  import { Resource } from "../flux/resourceStores/resource.enum";
  import {
    ResourceAccessPoint,
    ResourceActionType
  } from "../flux/resourceStores/resource.type";
  import { resourceAction } from "../flux/resourceStores/resource.utils";
  import Markdown from "../markdown/Markdown.svelte";
  import type { IMarkdown } from "../markdown/md.type";
  import { NodeType } from "$lib/client/products/memotron/node/node.type";
  import { generateResourceId } from "../flux/flux.utils";
  import ModalFooter from "../modal/ModalFooter.svelte";
  import { taskStore } from "./task.store";
  import { toasts } from "$lib/client/stores/notification.store";
  import { TaskType } from "./task.type";
  import { resolveTaskSubTypesForSwitcher } from "./task.utils";
  export let context: ResourceAccessPoint | undefined = undefined;

  let label: string = "";
  let type: TaskType = TaskType.INDEFINITE;
  let description: IMarkdown = {
    blocks: [
      {
        id: generateResourceId(Resource.node),
        contentType: NodeType.SIMPLE_TEXT,
        body: ""
      }
    ]
  };
  let date: Date | undefined;
  let isDescriptionVisible: boolean = false;
  let isSubTasksVisible: boolean = false;
  let isParentSelectorVisible: boolean = false;
  let isCollectionSelectorVisible: boolean = false;

  async function handleCreate() {
    try {
      if (!label) {
        toasts.error("Task name is required");
        return;
      }

      const task = {
        label,
        type,
        description: isDescriptionVisible ? description : undefined,
        startDate: type === TaskType.DEFINITE ? date : undefined,
        endDate: type === TaskType.DEFINITE ? date : undefined
      };

      await taskStore.save(task, {
        context:
          context ?? resourceAction(Resource.task, ResourceActionType.CREATE)
      });
      toasts.success("Task created successfully");
    } catch (error) {
      console.error("Error creating task:", error);
      toasts.error("Failed to create task");
    }
  }
</script>

<div
  class="flex flex-col h-full w-full gap-4 items-center justify-between overflow-auto"
>
  <div class="flex flex-col w-full gap-6">
    <!-- <LinkboxOnCapture /> -->
    <TextInput
      label={{ label: "Name of the task", orientation: Orientation.Vertical }}
      bind:value={label}
      placeholder="Some task name"
    />
    <OptionSelector
      labelProps={{
        label: "Type of the task",
        orientation: Orientation.Vertical
      }}
      bind:selected={type}
      options={resolveTaskSubTypesForSwitcher()}
      size={Size.md}
      style={OptionSelectorStyle.TRAIN}
    />
    {#if type === TaskType.DEFINITE}
      <DatePicker
        label={{
          label: "Start and end date",
          orientation: Orientation.Vertical
        }}
        bind:date
      />
    {/if}
    {#if isDescriptionVisible}
      <div class="flex flex-col gap-4 bg-bgs2 rounded-md p-4">
        <span class="text-b2 font-medium text-fgs2">Description</span>
        <Markdown bind:md={description} />
      </div>
    {/if}
  </div>

  <div class="flex flex-col gap-4 w-full">
    <div class="flex gap-3 flex-wrap items-center mt-8">
      {#if !isDescriptionVisible}
        <Button
          label="Add description"
          icon="ph:text"
          style={ButtonStyle.OUTLINED}
          size={Size.sm}
          on:click={() => (isDescriptionVisible = true)}
        />
      {/if}
      {#if !isSubTasksVisible}
        <Button
          label="Add sub tasks"
          icon="ph:tree-view-light"
          style={ButtonStyle.OUTLINED}
          size={Size.sm}
          on:click={() => (isSubTasksVisible = true)}
        />
      {/if}
      {#if !isParentSelectorVisible}
        <Button
          label="Add parent"
          icon="ph:arrow-elbow-right-up-light"
          style={ButtonStyle.OUTLINED}
          size={Size.sm}
          on:click={() => (isParentSelectorVisible = true)}
        />
      {/if}
      {#if !isCollectionSelectorVisible}
        <Button
          label="Add to a collection"
          icon="ph:plus-light"
          style={ButtonStyle.OUTLINED}
          size={Size.sm}
          on:click={() => (isCollectionSelectorVisible = true)}
        />
      {/if}
    </div>
    <ModalFooter
      action={resourceAction(Resource.task, ResourceActionType.CREATE)}
      primaryAction={{
        label: "Create",
        icon: "ph:floppy-disk-light",
        callback: handleCreate
      }}
      secondaryAction={{
        label: "Cancel",
        icon: "ph:x-light"
      }}
    />
  </div>
</div>
