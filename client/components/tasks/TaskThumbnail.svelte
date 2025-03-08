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
  export let item: ITaskThumb;
  export let arrangement: Arrangement = Arrangement.LIST;
  export let size: Size.sm | Size.md | Size.lg = Size.md;
  export let accessPoint: ResourceAccessPoint = ResourceAccessPoint.BROWSER;
  export let accessPointId: IRecordId | undefined = undefined;
  export let isApplyCustomColor: boolean = false;
  export let isDraggable: boolean = false;
  export let parentBgIndex: number = 1;
  let isHovering = false;
  let isDatePickerOpen = false;
</script>

<ResourceThumbnailBase
  {item}
  {arrangement}
  {accessPoint}
  {accessPointId}
  {isApplyCustomColor}
  {isDraggable}
>
  <div
    class="flex gap-2 items-center px-4 py-2 h-14 bg-bgs2/50 hover:bg-bgs2 border border-brs2 rounded-md"
    use:hoverable={{
      onHover: (value) => {
        isHovering = value;
      }
    }}
  >
    <TaskCheckbox
      id={item.id}
      bind:isChecked={item.isChecked}
      {size}
      {accessPoint}
    />
    <div class="flex-1 flex flex-col">
      {#if item.goal && accessPoint !== ResourceAccessPoint.GOAL}
        <TaskThumbnailGoalLabel goal={item.goal} />
      {/if}
      {#if item.isChecked}
        <span class="line-through">
          {item.label}
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

    {#if item.date && !isHovering}
      <span class="text-b3 text-fgs3">
        Due: {formatDate(item.date)}
      </span>
    {/if}
    {#if item.completed && !isHovering}
      {@const isCompletedBeforeDue =
        item.date && compareDates(item.completed, item.date, "<=")}
      {#if item.date}
        <span class="text-b3 text-fgs3"> | </span>
      {/if}
      <span
        class={cn("text-b3 text-ags1", {
          "text-ags1": isCompletedBeforeDue,
          "text-ars1": !isCompletedBeforeDue && item.date
        })}
      >
        Completed: {formatDate(item.completed)}
      </span>
    {/if}
    {#if isHovering || isDatePickerOpen}
      <div class="flex gap-2">
        <DatePicker
          date={item.date}
          placeholder="Set date"
          on:change={(e) => {
            item.date = e.detail;
            taskStore.modify(
              item.id,
              { date: e.detail },
              {
                context: accessPoint
              }
            );
          }}
          on:opened={() => {
            isDatePickerOpen = true;
          }}
          on:closed={() => {
            isDatePickerOpen = false;
          }}
        />
        <Button icon="ph:trash" />
      </div>
    {/if}
  </div>
</ResourceThumbnailBase>
