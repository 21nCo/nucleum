<script lang="ts">
  import type { ITaskThumb } from "@21n/components/tasks/task.type";
  import { Arrangement } from "@21n/types/direction.enum";
  import { Size } from "@21n/types/size.enum";
  import {
    AccessMode,
    ResourceAccessPoint
  } from "@21n/components/flux/resourceStores/resource.type";
  import ResourceThumbnailBase from "@21n/components/record/thumbnail/ResourceThumbnailBase.svelte";
  import { compareDates, parseAndFormatDate } from "@21n/utils/time.utils";
  import TaskCheckbox from "@21n/components/tasks/TaskCheckbox.svelte";
  import { hoverable } from "@21n/actions/hover.action";
  import DatePicker from "@21n/elements/datetime/DatePicker.svelte";
  import { taskStore } from "@21n/components/tasks/task.store";
  import Button from "@21n/elements/button/Button.svelte";
  import { InputStyle } from "@21n/types/input.type";
  import TextInput from "@21n/elements/input/TextInput.svelte";
  import { cn } from "@21n/utils/ui.utils";
  import type { IRecordId } from "@21n/types/data.type";
  import TaskThumbnailGoalLabel from "@21n/components/tasks/TaskThumbnailGoalLabel.svelte";
  import ComponentBaseLayer from "@21n/layout/layers/ComponentBaseLayer.svelte";
  import Icon from "@21n/elements/Icon.svelte";
  import ResourceThumbnailContextMenu from "@21n/components/record/thumbnail/ResourceThumbnailContextMenu.svelte";
  import view from "@21n/stores/view.store";
  import { createEventDispatcher } from "svelte";
  import { popover, tooltip } from "@21n/actions/popover.action";
  import AbsoluteTimeRangePopoverV2 from "@21n/elements/datetime/absolute/AbsoluteTimeRangePopoverV2.svelte";
  import { PopoverTriggerMethod } from "@21n/types/popover.type";
  import { generateMiniRandomId } from "@21n/shared-utils/crypto.utils";
  import { goalStore } from "@21n/components/goals/goal.store";
  import { resolveUnixTimestamp } from "@21n/shared-utils/time.utils";
  import FocusItemPickOverlay from "@21n/products/pointron/focus/elements/focusitem/FocusItemPickOverlay.svelte";
  import {
    activeSession,
    currentFocusItem
  } from "@21n/products/pointron/focus/session.store";
  import { movingBorder } from "@21n/actions/movingBorder.action";
  import { appStore } from "@21n/stores/app.store";
  import { ButtonStyle, ButtonVariant } from "@21n/types/button.type";
  import { Resource } from "@21n/components/flux/resourceStores/resource.enum";
  import { bulkEditStore } from "@21n/components/record/bulkedit.store";
  import Task from "@21n/components/tasks/Task.svelte";
  import context from "@21n/stores/context.store";
  import { stringify } from "@21n/shared-utils/json.utils";
  const dispatch = createEventDispatcher();
  export let item: ITaskThumb;
  export let arrangement: Arrangement = Arrangement.LIST;
  export let size: Size.sm | Size.md | Size.lg = Size.lg;
  export let accessPoint: ResourceAccessPoint = ResourceAccessPoint.BROWSER;
  export let accessPointId: IRecordId | undefined = undefined;
  export let isApplyCustomColor: boolean = false;
  export let isDraggable: boolean = false;
  export let parentBgIndex: number = 1;
  export let isShowGoal: boolean = false;
  let isHovering = false;
  let isDatePickerOpen = false;
  let isShowDatePickerOnCw = false;
  let isTaskOpened = false;
  const dev_isEnableBorderAnimation = false;
  const dev_isRenderTaskAsSheetOnMobile = false;
  $: isOverdue =
    !item.isChecked &&
    item.dateUnix &&
    compareDates(new Date(item.dateUnix), new Date(), "<");

  $: isCurrentlyFocusing = activeSession.isCurrentFocusItem(
    item.id,
    $currentFocusItem
  );

  $: multiSelectContext = {
    resource: Resource.task,
    accessPoint,
    accessPointId
  };
  let hasBulkSelection = false;
  $: {
    const state = bulkEditStore.getState();
    if (
      state.context &&
      stringify(state.context, { isPreventReplacer: true }) ===
        stringify(multiSelectContext, { isPreventReplacer: true })
    ) {
      hasBulkSelection = state.selectedIds.length > 0;
    } else {
      hasBulkSelection = false;
    }
  }

  const instanceId = generateMiniRandomId();

  async function onTaskChanges(event: CustomEvent) {
    const record = event.detail.params?.record;
    if ("isChecked" in record) {
      if (!record.isChecked) {
        item.isChecked = false;
        item.completedAtUnix = undefined;
      } else {
        item.isChecked = true;
        item.completedAtUnix = resolveUnixTimestamp();
      }
    } else if ("goalId" in record && record.goalId !== item.goalId) {
      item.goalId = record.goalId;
      item.goal = await goalStore.select(record.goalId);
    } else if ("label" in record && record.label !== item.label) {
      item.label = record.label;
    } else if ("dateUnix" in record && record.dateUnix !== item.dateUnix) {
      item.dateUnix = record.dateUnix;
    } else if (
      "completedAtUnix" in record &&
      record.completedAtUnix !== item.completedAtUnix
    ) {
      item.completedAtUnix = record.completedAtUnix;
    }
  }

  function onContextMenuAction(event: CustomEvent) {
    const action = event.detail.action;
    if (action === "editDate") {
      isShowDatePickerOnCw = true;
    } else if (action === "openTask") {
      if ($view.isConstrainedWidth && dev_isRenderTaskAsSheetOnMobile)
        isTaskOpened = true;
      else appStore.openResource(item.id, AccessMode.POP);
    }
    dispatch("action", event.detail);
  }

  async function onDateChange(val: Date) {
    item.dateUnix = resolveUnixTimestamp(val);
    await taskStore.modify(
      item.id,
      { dateUnix: item.dateUnix },
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
  {#if $view.isConstrainedWidth && isTaskOpened}
    <div
      use:popover={{
        content: Task,
        triggerMethod: [PopoverTriggerMethod.SHOW_BY_DEFAULT],
        isRenderAsModalForCW: true,
        componentProps: {
          id: item.id,
          accessPoint,
          accessPointId,
          accessMode: AccessMode.SHEET
        }
      }}
      on:change={(e) => {
        const isPopoverVisible = e.detail?.open;
        if (isPopoverVisible) {
          isTaskOpened = true;
        } else {
          isTaskOpened = false;
        }
      }}
    />
  {/if}
  <div
    class={cn("flex gap-2 items-center pr-1 pl-2 py-2 rounded-md", {
      "m-4 min-w-[30rem]": accessPoint === ResourceAccessPoint.SELF,
      "hover:bg-bgs2 border": accessPoint !== ResourceAccessPoint.SELF,
      "border-aps1": isCurrentlyFocusing,
      "border-transparent hover:border-brs2":
        !isCurrentlyFocusing && accessPoint !== ResourceAccessPoint.SELF,
      "min-h-14 h-14": item.goal && isShowGoal,
      "min-h-10 h-10": !item.goal || !isShowGoal
    })}
    use:movingBorder={{
      speed: 4000,
      borderWidth: "2px",
      borderColor: "aps2",
      enabled: isCurrentlyFocusing && dev_isEnableBorderAnimation
    }}
    use:hoverable={{
      onHover: (value) => {
        isHovering = value;
      }
    }}
  >
    <div
      class={cn("flex", {
        "self-start": item.goal && accessPoint !== ResourceAccessPoint.GOAL,
        "opacity-0": hasBulkSelection
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
      {#if item.goal && isShowGoal}
        <TaskThumbnailGoalLabel goal={item.goal} {accessPoint} />
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
            placeholder="Task name"
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
            selectedDate: item.dateUnix ? new Date(item.dateUnix) : undefined,
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
    {#if !isHovering && isCurrentlyFocusing}
      <div class="flex flex-col items-end">
        <span class="text-b3 text-aps1 userdata"> Focusing... </span>
      </div>
    {/if}
    {#if accessPoint !== ResourceAccessPoint.PICKER}
      <div class="flex flex-col items-end">
        {#if item.dateUnix && !isHovering && !isCurrentlyFocusing && accessPoint !== ResourceAccessPoint.CALENDAR}
          <div
            class={cn("text-b3 userdata", {
              "text-ars1": isOverdue,
              "text-fgs3": !isOverdue
            })}
          >
            Due: {parseAndFormatDate(item.dateUnix)}
          </div>
        {/if}

        {#if item.completedAtUnix && !isHovering && !$view.isConstrainedWidth}
          {@const isCompletedBeforeDue =
            item.dateUnix &&
            compareDates(
              new Date(item.completedAtUnix),
              new Date(item.dateUnix),
              "<="
            )}
          <span
            class={cn("text-b3 text-ags1 userdata", {
              "text-ags1": isCompletedBeforeDue,
              "text-ars1": !isCompletedBeforeDue && item.dateUnix
            })}
          >
            Completed: {parseAndFormatDate(item.completedAtUnix)}
          </span>
        {/if}
      </div>

      {#if isHovering || isDatePickerOpen || ($context.isTouchDevice && !$view.isPortrait)}
        {@const isInlineContext =
          accessPoint === ResourceAccessPoint.BROWSER &&
          !$view.isConstrainedWidth}
        {#if !isCurrentlyFocusing}
          <Button
            icon="circle"
            tooltip="Focus now"
            size={Size.sm}
            type={ButtonVariant.PRIMARY}
            style={ButtonStyle.OUTLINED}
            on:click={() => {
              activeSession.focusTask(item.id, item.goalId);
            }}
          />
        {/if}
        <div
          class="flex gap-2 shrink-0"
          use:tooltip={{
            text: item.dateUnix ? "Change date" : "Set date",
            delay: 0
          }}
        >
          <DatePicker
            date={item.dateUnix ? new Date(item.dateUnix) : undefined}
            id={instanceId}
            variant="icon-only"
            size={Size.sm}
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
        <Button
          icon={isInlineContext ? "proceed" : "pop"}
          parentBgIndex={2}
          tooltip="Open"
          size={Size.sm}
          style={ButtonStyle.OUTLINED}
          isPreventMinWidth={true}
          on:click={() => {
            if (isInlineContext && accessPoint === ResourceAccessPoint.GOAL) {
              if (accessPointId)
                appStore.toggleSearchParamRecordSpecific(accessPointId, {
                  task: item.id.toString()
                });
              return;
            }
            appStore.openResource(
              item.id,
              isInlineContext ? AccessMode.INLINE : AccessMode.POP
            );
          }}
        />
      {/if}
      <ResourceThumbnailContextMenu
        bind:item
        {accessPoint}
        {accessPointId}
        {arrangement}
        {isApplyCustomColor}
        bgSize={Size.sm}
        on:action={onContextMenuAction}
        isInline={true}
      />
    {:else if accessPoint === ResourceAccessPoint.PICKER}
      <FocusItemPickOverlay {isHovering} {item} />
    {/if}
  </div>
</ResourceThumbnailBase>
<ComponentBaseLayer subscribeToRecords={[item.id]} on:change={onTaskChanges} />
