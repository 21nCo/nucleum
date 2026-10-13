<script lang="ts">
  import { navigation } from "@nucleum/shell/navigation/navigation";

  import { AccessMode } from "@nucleum/datafn/resource.type";
  import Icon from "@21n/ui/elements/Icon.svelte";

  import { Action } from "@nucleum/client/config/action.enum";
  import { AppSearchParam } from "@nucleum/shared-state/app-context/app-store.type";
  import { TimeFormat } from "@21n/shared-utils/datetime/duration.type";
  import { parseAndFormatDate } from "@21n/shared-utils/datetime/date-formatting";
import { formatSeconds } from "@21n/ui/elements/time/duration-format";

  let {
    date,
    title,
    totalFocus,
    objectives = []
  }: {
    date: Date;
    title: string;
    totalFocus: number;
    objectives?: string[];
  } = $props();
</script>

<button
  class="flex flex-col items-center h-48 w-48 rounded-xl bg-bgs2 hover:bg-bgs3-striped overflow-hidden flex-1 min-w-48"
  onclick={() => {
    navigation.openResource(Action.CALENDAR_DAY, AccessMode.POP, {
      searchParams: { [AppSearchParam.DATE]: date.toISOString() }
    });
  }}
>
  <div class="p-4 flex flex-col justify-between gap-4 flex-1 w-full">
    <div class="flex items-center justify-between w-full">
      <div class="flex flex-col items-start text-left">
        <div class="text-h5">{title}</div>
        <div class="text-fgs3 text-b2">{parseAndFormatDate(date)}</div>
      </div>
      <div
        class="h-8 w-8 rounded-full bg-aps1 flex items-center justify-center"
      >
        <Icon icon="calendar-blank" class="text-abg" />
      </div>
    </div>

    <div class="flex flex-col w-full items-start">
      <div class="text-h3 font-bold text-aps1">
        {formatSeconds(totalFocus, TimeFormat.VERBOSE)}
      </div>
      <div class="text-fgs2 text-b3">Focus hours</div>
    </div>
  </div>

  <div class="w-full h-1 bg-gradient-to-r from-aps1 to-aps2"></div>
</button>
