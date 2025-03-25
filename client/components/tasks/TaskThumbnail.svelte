<script lang="ts">
  import type { ITaskThumb } from "./task.type";
  import { Arrangement } from "$lib/client/types/direction.enum";
  import { Size } from "$lib/client/types/size.enum";
  import { ResourceAccessPoint } from "$lib/client/components/flux/resourceStores/resource.type";
  import ResourceThumbnailBase from "../record/thumbnail/ResourceThumbnailBase.svelte";
  import { compareDates, formatDate } from "$lib/client/utils/time.utils";
  import TaskCheckbox from "./TaskCheckbox.svelte";
  import { hoverable } from "$lib/client/actions/hover.action";
  import DatePicker from "$lib/client/elements/datetime/DatePicker.svelte";
  import { taskStore } from "./task.store";
  import Button from "$lib/client/elements/button/Button.svelte";
  import { InputStyle } from "$lib/client/types/input.type";
  import TextInput from "$lib/client/elements/input/TextInput.svelte";
  import { cn } from "$lib/client/utils/ui.utils";
  import type { IRecordId } from "$lib/client/types/data.type";
  import TaskThumbnailGoalLabel from "./TaskThumbnailGoalLabel.svelte";
  import ComponentBaseLayer from "$lib/client/layout/layers/ComponentBaseLayer.svelte";
  import { Resource } from "../flux/resourceStores/resource.enum";
  import Icon from "$lib/client/elements/Icon.svelte";
  import ResourceThumbnailContextMenu from "../record/thumbnail/ResourceThumbnailContextMenu.svelte";
  import view from "$lib/client/stores/view.store";
  import { createEventDispatcher } from "svelte";
  import { popover } from "$lib/client/actions/popover.action";
  import AbsoluteTimeRangePopoverV2 from "$lib/client/elements/datetime/absolute/AbsoluteTimeRangePopoverV2.svelte";
  import { PopoverTriggerMethod } from "$lib/client/types/popover.type";
  import { generateMiniRandomId } from "$lib/shared/utils/crypto.utils";
  const dispatch = createEventDispatcher();
  export let item: ITaskThumb;
  export let arrangement: Arrangement = Arrangement.LIST;
  export let size: Size.sm | Size.md | Size.lg = Size.lg;
  export let accessPoint: ResourceAccessPoint = ResourceAccessPoint.BROWSER;
  export let accessPointId: IRecordId | undefined = undefined;
  export let isApplyCustomColor: boolean = false;
  export let isDraggable: boolean = false;
  export let parentBgIndex: number = 1;
  let isHovering = false;
  let isDatePickerOpen = false;
  let isShowDatePickerOnCw = false;
  $: isOverdue =
    !item.isChecked && item.date && compareDates(item.date, new Date(), "<");

  const instanceId = generateMiniRandomId();

  function onTaskChanges(event: CustomEvent) {
    const record = event.detail.params?.record;
    if ("isChecked" in record && record.isChecked !== item.isChecked) {
      item.isChecked = record.isChecked;
      if (!item.isChecked) {
        item.completedAt = undefined;
      } else {
        item.completedAt = new Date();
      }
    }
  }

  function onContextMenuAction(event: CustomEvent) {
    if (event.detail.action === "editDate") {
      isShowDatePickerOnCw = true;
    }
    dispatch("action", event.detail);
  }

  async function onDateChange(val: Date) {
    item.date = val;
    await taskStore.modify(
      item.id,
      { date: val },
      {
        context: accessPoint
      }
    );
    isShowDatePickerOnCw = false;
  }
</script>

<ResourceThumbnailBase
  {item}
  {arrangement}
  {accessPoint}
  {accessPointId}
  {isApplyCustomColor}
  {isDraggable}
  isPreventDefaultContextMenu={true}
>
  <div
    class={cn("flex gap-2 items-center pr-1 pl-3 py-2 h-14 rounded-md", {
      "m-4 min-w-[30rem] pr-12": accessPoint === ResourceAccessPoint.SELF,
      "bg-bgs2/50 hover:bg-bgs2 border border-brs2":
        accessPoint !== ResourceAccessPoint.SELF
    })}
    use:hoverable={{
      onHover: (value) => {
        isHovering = value;
      }
    }}
  >
    <div
      class={cn("flex", {
        "self-start": item.goal && accessPoint !== ResourceAccessPoint.GOAL
      })}
    >
      <TaskCheckbox
        id={item.id}
        bind:isChecked={item.isChecked}
        size={Size.lg}
        {accessPoint}
      />
    </div>
    <div class="flex-1 min-w-0 flex flex-col userdata whitespace-no-wrap">
      {#if item.goal && accessPoint !== ResourceAccessPoint.GOAL}
        <TaskThumbnailGoalLabel goal={item.goal} />
      {/if}
      {#if item.isChecked}
        <span class="flex line-through whitespace-no-wrap w-full">
          <span class="truncate">
            {item.label}
          </span>
        </span>
      {:else}
        <span class="">
          <TextInput
            bind:value={item.label}
            style={InputStyle.PLAIN}
            on:debouncedChange={(e) => {
              taskStore.modify(
                item.id,
                { label: e.detail },
                { context: accessPoint }
              );
            }}
          />
        </span>
      {/if}
    </div>
    {#if isShowDatePickerOnCw}
      <div
        use:popover={{
          content: AbsoluteTimeRangePopoverV2,
          id: "task-date-picker-popover" + instanceId,
          triggerMethod: [PopoverTriggerMethod.SHOW_BY_DEFAULT],
          isRenderAsModalForCW: true,
          componentProps: {
            isDatePickerMode: true,
            selectedDate: item.date,
            isCWPopoverContext: true,
            onDateChange: (val) => {
              onDateChange(val);
            }
          }
        }}
        on:change={(e) => {
          const isPopoverVisible = e.detail?.open;
          if (isPopoverVisible) {
            isShowDatePickerOnCw = true;
          } else {
            isShowDatePickerOnCw = false;
          }
        }}
      ></div>
    {/if}
    <div class="flex flex-wrap gap-2 justify-end">
      {#if item.date && !isHovering}
        <button
          class={cn("text-b3 userdata", {
            "text-ars1": isOverdue,
            "text-fgs3": !isOverdue
          })}
          on:click|stopPropagation={() => {
            isShowDatePickerOnCw = true;
          }}
        >
          Due: {formatDate(item.date)}
        </button>
      {/if}
      {#if item.completedAt && !isHovering && !$view.isConstrainedWidth}
        {@const isCompletedBeforeDue =
          item.date && compareDates(item.completedAt, item.date, "<=")}
        {#if item.date}
          <span class="text-b3 text-fgs3 userdata"> | </span>
        {/if}
        <span
          class={cn("text-b3 text-ags1 userdata", {
            "text-ags1": isCompletedBeforeDue,
            "text-ars1": !isCompletedBeforeDue && item.date
          })}
        >
          Completed: {formatDate(item.completedAt)}
        </span>
      {/if}
    </div>

    {#if isHovering || isDatePickerOpen}
      <div class="flex gap-2 shrink-0">
        <DatePicker
          date={item.date}
          id={instanceId}
          placeholder="Set date"
          on:change={(e) => {
            onDateChange(e.detail);
          }}
          on:opened={() => {
            isDatePickerOpen = true;
          }}
          on:closed={() => {
            isDatePickerOpen = false;
          }}
        />
      </div>
    {/if}
    <ResourceThumbnailContextMenu
      bind:item
      {accessPoint}
      {accessPointId}
      {arrangement}
      {isApplyCustomColor}
      on:action={onContextMenuAction}
      isInline={true}
    />
  </div>
</ResourceThumbnailBase>
<ComponentBaseLayer
  subscribeToResource={new Set([Resource.task])}
  subscribeToRecords={[item.id]}
  on:change={onTaskChanges}
/>
