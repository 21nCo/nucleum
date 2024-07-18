<script lang="ts">
  import { AnalyticsPersistence } from "$lib/client/products/pointron/analytics/analytics.persistence";
  import { getCorrespoingHorizonFrequencyLabel } from "$lib/client/utils/time.utils";
  import Guage from "../charts/Guage.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import { TimeScale } from "$lib/client/types/time.type";
  import { isValidArrayWithData } from "$lib/shared/utils/obj.utils";
  import Icon from "$lib/client/elements/Icon.svelte";
  import EmptyStatusView from "$lib/client/elements/feedback/EmptyStatusView.svelte";
  import { appStore } from "$lib/client/stores/app.store";
  import { PointronAction } from "$lib/client/types/pointron/pointronAction.enum";
  export let size: Size = Size.sm;
  export let type: "semi" | "full" = "semi";
  export let parentBgIndex: number = 1;
  export let data:
    | {
        scale: TimeScale;
        actual: number;
        target: number;
        streak: { value: number; lastWhenStreakBroke: string };
        isCurrentAchieved: boolean;
      }[]
    | [] = [];
  let guages: {
    label: string;
    total: number;
    actual: number;
    streak: number;
  }[];
  const aggPersistance = new AnalyticsPersistence();
  refresh();
  async function refresh() {
    let items: {
      label: string;
      total: number;
      actual: number;
      streak: number;
    }[] = [];
    if (!isValidArrayWithData(data)) {
      data = await aggPersistance.fetchTargetsData();
    }
    if (!isValidArrayWithData(data)) return;
    Object.keys(TimeScale).forEach((key) => {
      if (data.some((x) => x.scale === key)) {
        let item = data.find((x) => x.scale === key);
        if (!item) return;
        try {
          if (item.target != undefined && item.actual != undefined) {
            const actual = +item.actual.toFixed(2);
            const label =
              getCorrespoingHorizonFrequencyLabel(item.scale) +
              (size != Size.sm ? " target" : "");
            items.push({
              total: item.target,
              actual,
              label,
              streak: item.streak?.value
            });
          }
        } catch (e) {
          console.error(e);
        }
        guages = items;
      }
    });
  }
  $: console.log({ guages });
</script>

<div class="flex justify-evenly w-full flex-wrap gap-8">
  {#if guages && guages.length > 0}
    {#each guages as guage}
      <div class="flex flex-col gap-1">
        <Guage
          total={guage.total}
          actual={guage.actual}
          label={guage.label}
          {size}
          guageType={type}
        />
        {#if guage.streak && guage.streak > 0}
          <div
            class="flex gap-1 items-center justify-center bg-bgs2 rounded-md py-1"
          >
            <Icon icon="fire" size={Size.sm} />
            <p class="text-b4">
              Streak: {guage.streak}
            </p>
          </div>
        {/if}
      </div>
    {/each}
  {:else}
    <EmptyStatusView
      mainText="No targets set."
      subText="Please set targets to see them here."
      actionText="Set targets"
      {parentBgIndex}
      on:click={() => {
        appStore.runAction(PointronAction.SET_TARGETS);
      }}
    />
  {/if}
</div>
