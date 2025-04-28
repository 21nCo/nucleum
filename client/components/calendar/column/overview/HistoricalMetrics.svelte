<script lang="ts">
  import { ResourceAccessMode } from "$lib/client/components/flux/resourceStores/resource.type";
  import Icon from "$lib/client/elements/Icon.svelte";
  import { appStore } from "$lib/client/stores/app.store";
  import { Action } from "$lib/client/types/action.enum";
  import { AppSearchParam } from "$lib/client/types/appStore.type";
  import { TimeFormat } from "$lib/client/types/time.type";
  import { formatDate, formatSeconds } from "$lib/client/utils/time.utils";

  export let date: Date;
  export let title: string;
  export let totalFocus: number;
  export let goals: string[] = [];
</script>

<button
  class="flex flex-col items-center h-60 w-48 rounded-xl bg-bgs2 shadow-lg overflow-hidden flex-1 min-w-48"
  on:click={() => {
    appStore.openResource(Action.CALENDAR_DAY, ResourceAccessMode.POP, {
      searchParams: { [AppSearchParam.DATE]: date.toISOString() }
    });
  }}
>
  <div class="p-4 flex flex-col justify-between gap-4 flex-1 w-full">
    <div class="flex items-center justify-between w-full">
      <div class="flex flex-col items-start text-left">
        <div class="text-h4">{title}</div>
        <div class="text-fgs3 text-b2">{formatDate(date)}</div>
      </div>
      <div
        class="h-8 w-8 rounded-full bg-aps1 flex items-center justify-center"
      >
        <Icon icon="ph:calendar-blank-light" class="text-abg" />
      </div>
    </div>

    <div class="flex flex-col w-full items-start">
      <div class="text-h3 font-bold text-aps1">
        {formatSeconds(totalFocus, TimeFormat.VERBOSE)}
      </div>
      <div class="text-fgs2 text-b3">Focus hours</div>
    </div>
  </div>

  <div class="w-full h-1.5 bg-gradient-to-r from-aps1 to-aps2"></div>
</button>
