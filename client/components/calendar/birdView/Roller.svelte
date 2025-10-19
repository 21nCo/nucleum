<script lang="ts">
  import { Itemtype, type ProgrammedWheelEvent } from "@21n/components/calendar/birdView/Birdview.type";
  import { createEventDispatcher, onMount } from "svelte";
  import RollerButton from "@21n/components/calendar/birdView/RollerButton.svelte";
  import {
    getFirstAlphabetPosition,
    getLastAlphabetPosition,
    waitForTimeout
  } from "@21n/components/calendar/birdView/Birdview.utils";
  import { debouncer } from "@21n/utils/utils";
  import { cn } from "@21n/utils/ui.utils";
  let dispatch = createEventDispatcher();
  export let config: any;
  export let items: any;
  export let selectedItem: string | number;
  export let handleWheelEvent: (e: WheelEvent | ProgrammedWheelEvent) => void;
  export let container: HTMLDivElement;
  let containerHeight;
  let monthNames: any = [
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
  function getMonthDiff(
    currSellectedYear: number,
    currSellectedMonth: string,
    prevSellectedYear: number = Number(
      String(selectedItem).slice(
        0,
        getFirstAlphabetPosition(String(selectedItem))
      )
    ),
    prevSellectedMonth: string = String(selectedItem).slice(-3)
  ) {
    let monthDifference: number;
    const currSellectedMonthIndex = monthNames.indexOf(currSellectedMonth);
    const prevSellectedMonthIndex = monthNames.indexOf(prevSellectedMonth);
    monthDifference = (currSellectedYear - prevSellectedYear) * 12;
    monthDifference -= prevSellectedMonthIndex;
    monthDifference += currSellectedMonthIndex;
    return monthDifference;
  }
  function getDayDiff(
    currSelectedItem: string,
    prevSelectedItem: string = String(selectedItem)
  ) {
    const currSelectedItemIndex = items.indexOf(currSelectedItem);
    const prevSelectedItemIndex = items.indexOf(prevSelectedItem);
    return currSelectedItemIndex - prevSelectedItemIndex;
  }
  async function handlWheelCall(isPositive: boolean, diff: number) {
    for (let i = 0; i < diff; i++)
      await waitForTimeout(() =>
        handleWheelEvent({
          deltaY: isPositive ? 1 : -1,
          isWheelEvent: true
        })
      );
  }
  async function handleClick(
    currSelectedItem: string | number,
    prevSelectedItem: string | number = selectedItem
  ) {
    let isPositive: boolean;
    let diff: number;
    switch (config.itemType) {
      case Itemtype.YEAR:
        isPositive = Number(currSelectedItem) > Number(prevSelectedItem);
        diff = Math.abs(Number(currSelectedItem) - Number(prevSelectedItem));
        await handlWheelCall(isPositive, diff);
        break;
      case Itemtype.MONTH:
        diff = getMonthDiff(
          Number(
            String(currSelectedItem).slice(
              0,
              getFirstAlphabetPosition(String(selectedItem))
            )
          ),
          String(currSelectedItem).slice(-3)
        );
        isPositive = diff > 0;
        diff = Math.abs(diff);
        await handlWheelCall(isPositive, diff);
        break;
      case Itemtype.DAY:
        diff = getDayDiff(String(currSelectedItem));
        isPositive = diff > 0;
        diff = Math.abs(diff);
        await handlWheelCall(isPositive, diff);
        break;
    }
  }
  function scrollToselectedItem() {
    if (container && selectedItem) {
      config.containerHeight = container.offsetHeight;
      const selectedItemElement: HTMLElement | null = container.querySelector(
        `[data-${config.itemType}="${selectedItem}"]`
      );
      if (selectedItemElement) {
        const selectedItemElementHeight = selectedItemElement.offsetHeight;
        const selectedItemElementOffsetTop = selectedItemElement.offsetTop;
        const scrollTop =
          selectedItemElementOffsetTop -
          config.containerHeight / 2 +
          config.itemHeight;
        container.scrollTo({ top: scrollTop, behavior: "smooth" });
      }
    }
  }

  onMount(() => {
    dispatch("mount", scrollToselectedItem);
    const debouncedHandleWheelEvent = debouncer(handleWheelEvent, 200);
    container.addEventListener("wheel", debouncedHandleWheelEvent);
    scrollToselectedItem();
  });
</script>

<div
  class={cn(
    "overflow-hidden",
    { "w-20": config.itemType == Itemtype.YEAR },
    { "w-[60px]": config.itemType == Itemtype.MONTH },
    { "w-[60px]": config.itemType == Itemtype.DAY }
  )}
  bind:this={container}
  bind:clientHeight={containerHeight}
>
  {#each items as item}
    {#if (config.itemType == Itemtype.YEAR && item % 10 == 0) || config.itemType == Itemtype.MONTH || (config.itemType == Itemtype.DAY && item.slice(getLastAlphabetPosition(item) + 1) == 1)}
      <div
        class="text-xs text-fgs2 text-left leading-loose opacity-75 pl-1 border-t border-brs3"
        style="height:{config.itemHeight}px;"
      >
        {config.itemType == Itemtype.YEAR
          ? `${item} - ${item + 9}`
          : config.itemType == Itemtype.MONTH
            ? `${item}`
            : `${item.slice(getFirstAlphabetPosition(item), getLastAlphabetPosition(item) + 1)}-${item.slice(2, getFirstAlphabetPosition(item))}`}
      </div>
    {/if}
    {#if config.itemType == Itemtype.MONTH}
      {#each monthNames as month}
        <RollerButton
          {config}
          item={month}
          prefix={item}
          bind:selectedItem
          {handleClick}
        />
      {/each}
    {:else}
      <RollerButton
        {config}
        prefix={config.itemType == Itemtype.YEAR
          ? ""
          : item.slice(0, getLastAlphabetPosition(item) + 1)}
        item={config.itemType == Itemtype.YEAR
          ? item
          : item.slice(getLastAlphabetPosition(item) + 1)}
        bind:selectedItem
        {handleClick}
      />
    {/if}
  {/each}
</div>
