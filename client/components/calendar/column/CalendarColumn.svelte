<script lang="ts">
  import ComingSoonView from "$lib/client/elements/ComingSoonView.svelte";
  import DropDown from "$lib/client/elements/dropdown/DropDown.svelte";
  import OptionSelector from "$lib/client/elements/select/OptionSelector.svelte";
  import { appStore } from "$lib/client/stores/app.store";
  import { InputStyle } from "$lib/client/types/input.type";
  import { Product } from "$lib/client/types/product.type";
  import { OptionSelectorStyle } from "$lib/client/types/select.type";
  import { Size } from "$lib/client/types/size.enum";
  import { TimeScaleUnit } from "$lib/client/types/time.type";
  import { formatDate } from "$lib/client/utils/time.utils";
  import { Resource } from "../../flux/resourceStores/resource.enum";
  import { ResourceAccessPoint } from "../../flux/resourceStores/resource.type";
  import { SearchStore } from "../../record/record.store";
  import type { ITaskThumb } from "../../tasks/task.type";
  import TaskRecords from "../../tasks/TaskRecords.svelte";
  import { CalendarColumnPanel } from "../calendar.type";
  export let scale: TimeScaleUnit;
  export let date: Date;
  let tasks: ITaskThumb[] = [];
  let selectedPanel: CalendarColumnPanel = CalendarColumnPanel.Timeline;

  $: panels = resolvePanels($appStore.product);

  async function loadTasks() {
    tasks = await new SearchStore(Resource.task).select({
      filters: {
        date
      }
    });
  }

  async function onSelectPanel(e: CustomEvent) {
    if (selectedPanel === CalendarColumnPanel.Timeline) {
      await loadTasks();
    }
  }

  function resolvePanels(product: Product) {
    const timeline = {
      label: "Timeline",
      value: "timeline",
      icon: "ph:clock-light"
    };
    const history = {
      label: "History",
      value: "history",
      icon: "ph:clock-counter-clockwise-light"
    };
    const overview = {
      label: "Overview",
      value: "overview",
      icon: "heroicons:rectangle-group"
    };
    const notes = {
      label: "Notes",
      value: "notes",
      icon: "ph:note-light"
    };

    switch (product) {
      case Product.POINTRON:
        return [timeline, overview, history];
      case Product.MEMOTRON:
      case Product.NUCLEUS:
        return [timeline, overview, notes, history];
      default:
        return [timeline, overview, history];
    }
  }
</script>

<div class="text-fgs3 text-h4 font-medium flex flex-col h-full">
  <div class="flex items-center justify-between">
    <div>
      {formatDate(date)}
    </div>
    <div>
      <!-- <DropDown
        items={panels}
        isDisableSearch={true}
        popoverWidth="w-40"
        size={Size.sm}
        style={InputStyle.PLAIN}
        bind:value={selectedPanel}
        on:select={onSelectPanel}
      /> -->
      <OptionSelector
        options={panels}
        bind:selected={selectedPanel}
        on:select={onSelectPanel}
        style={OptionSelectorStyle.ICON}
        size={Size.sm}
      />
    </div>
  </div>
  {#if selectedPanel === CalendarColumnPanel.Timeline}
    <div class="overflow-auto py-3 text-b2">
      <TaskRecords data={tasks} accessPoint={ResourceAccessPoint.CALENDAR} />
    </div>
  {:else}
    <div class="my-auto">
      <ComingSoonView />
    </div>
  {/if}
</div>
