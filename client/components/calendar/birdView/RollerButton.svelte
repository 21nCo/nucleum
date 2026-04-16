<script lang="ts">
  import { cn } from "@21n/utils/ui.utils";
  import { Itemtype } from "@21n/components/calendar/birdView/Birdview.type";
  import { getFirstAlphabetPosition } from "@21n/components/calendar/birdView/Birdview.utils";

  let {
    config,
    item,
    label,
    suffix,
    adornment,
    selectedItem = $bindable(),
    handleClick,
    prefix = ""
  }: {
    config: any;
    item: any;
    label?: string | number;
    suffix?: string;
    adornment?: string;
    selectedItem?: any;
    handleClick: (value: any) => void;
    prefix?: string;
  } = $props();

  const currYear = new Date().getFullYear();
  const currMonthIndex = new Date().getMonth();
  const monthNames: any = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec"
  ];
  const currMonth = monthNames[currMonthIndex];
  const currDate = new Date().getDate();
  const isSelected = $derived(selectedItem == prefix + item);
  const state = $derived.by(() => {
    switch (config.itemType) {
      case Itemtype.YEAR:
        return {
          isToday: currYear == item,
          isPast: currYear > item
        };
      case Itemtype.MONTH:
        return {
          isToday: currYear == Number(prefix) && currMonth == item,
          isPast:
            currYear > Number(prefix) ||
            (currYear == Number(prefix) &&
              currMonthIndex > monthNames.indexOf(item))
        };
      case Itemtype.DAY: {
        const firstAlphIndex = getFirstAlphabetPosition(prefix);
        return {
          isToday:
            currYear == Number(prefix.slice(0, firstAlphIndex)) &&
            currMonth == prefix.slice(-3) &&
            currDate == Number(item),
          isPast:
            currYear > Number(prefix.slice(0, firstAlphIndex)) ||
            (currYear == Number(prefix.slice(0, firstAlphIndex)) &&
              currMonthIndex > monthNames.indexOf(prefix.slice(-3))) ||
            (currYear == Number(prefix.slice(0, firstAlphIndex)) &&
              currMonthIndex == monthNames.indexOf(prefix.slice(-3)) &&
              currDate > Number(item))
        };
      }
      default:
        return { isToday: false, isPast: false };
    }
  });
</script>

<button
  class={cn(
    "item relative block w-full text-b2 disabled:opacity-50",
    { "text-aps1": isSelected },
    { "text-ass1": state.isToday && !isSelected },
    { "text-fgs2": state.isPast && !isSelected && !state.isToday },
    { "text-fgs3": !isSelected && !state.isToday && !state.isPast },
    { "font-bold": isSelected }
  )}
  style="height:{config.itemHeight}px;"
  {...{
    [`data-${config.itemType}`]: `${prefix}${item}`
  }}
  onclick={() => {
    handleClick(prefix + item);
  }}
  onkeydown={(event) => {
    if (event.key === "Enter") {
      handleClick(prefix + item);
    }
  }}
>
  <span class="flex w-full items-center justify-center">
    <span class="relative inline-flex items-center justify-center">
      <span>{label ?? item}</span>
      {#if suffix || adornment}
        <span
          class="absolute left-full ml-1 top-1/2 inline-flex -translate-y-1/2 items-center gap-1"
        >
          {#if suffix}
            <span
              class={cn(
                "rounded-full px-1.5 py-0.5 text-b5 leading-none",
                { "bg-aps3 text-aps1": isSelected },
                { "bg-bgs3 text-fgs3": !isSelected }
              )}
            >
              {suffix}
            </span>
          {/if}
          {#if adornment}
            <span class="text-b4 leading-none">
              {adornment}
            </span>
          {/if}
        </span>
      {/if}
    </span>
  </span>
</button>
