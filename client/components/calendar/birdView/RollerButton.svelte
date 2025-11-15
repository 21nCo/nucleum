<script lang="ts">
  import { cn } from "@21n/utils/ui.utils";
  import { Itemtype } from "@21n/components/calendar/birdView/Birdview.type";
  import { getFirstAlphabetPosition } from "@21n/components/calendar/birdView/Birdview.utils";

  export let config;
  export let item;
  export let selectedItem: any;
  export let handleClick;
  export let prefix = "";

  let firstAlphIndex: number | undefined;
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
  let isPrimary: boolean;
  let isTertiary: boolean;

  $: switch (config.itemType) {
    case Itemtype.YEAR:
      isPrimary = currYear == item;
      isTertiary = currYear > item;
      break;
    case Itemtype.MONTH:
      isPrimary = currYear == Number(prefix) && currMonth == item;
      isTertiary =
        currYear > Number(prefix) ||
        (currYear == Number(prefix) &&
          currMonthIndex > monthNames.indexOf(item));
      break;
    case Itemtype.DAY:
      firstAlphIndex = getFirstAlphabetPosition(prefix);
      isPrimary =
        currYear == Number(prefix.slice(0, firstAlphIndex)) &&
        currMonth == prefix.slice(-3) &&
        currDate == Number(item);
      isTertiary =
        currYear > Number(prefix.slice(0, firstAlphIndex)) ||
        (currYear == Number(prefix.slice(0, firstAlphIndex)) &&
          currMonthIndex > monthNames.indexOf(prefix.slice(-3))) ||
        (currYear == Number(prefix.slice(0, firstAlphIndex)) &&
          currMonthIndex == monthNames.indexOf(prefix.slice(-3)) &&
          currDate > Number(item));
      break;
  }
</script>

<button
  class={cn(
    "item block w-full text-b3 disabled:opacity-50",
    { "text-fgs2": isTertiary },
    { "text-aps1": isPrimary },
    { "text-fgs3": !isPrimary && !isTertiary },
    { "font-bold": selectedItem == prefix + item }
  )}
  style="height:{config.itemHeight}px;"
  {...{
    [`data-${config.itemType}`]: `${prefix}${item}`
  }}
  on:click={() => {
    handleClick(prefix + item);
  }}
  on:keydown={(event) => {
    if (event.key === "Enter") {
      handleClick(prefix + item);
    }
  }}
>
  {item}
</button>
