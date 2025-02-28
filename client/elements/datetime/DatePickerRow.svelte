<script lang="ts">
  import { createEventDispatcher, onMount } from "svelte";
  import Icon from "../Icon.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import { cn } from "$lib/client/utils/ui.utils";

  export let isDateMode: boolean = true;
  export let date: Date = new Date();
  export let currentPage: number = 1;

  const dispatch = createEventDispatcher();
  let containerWidth: number = 300;
  let minItemWidth = 40;
  let containerRef: HTMLDivElement;
  let previousMode = isDateMode;
  let previousDate: Date = new Date(date);
  let resizeObserver: ResizeObserver;
  let resizeTimeout: ReturnType<typeof setTimeout> | null = null;
  let lastResizeWidth: number = 0;

  let viewDate = new Date(date);
  let selectedDate: Date | null = new Date(date);

  let selectedValue: number | null = selectedDate
    ? isDateMode
      ? selectedDate.getDate()
      : selectedDate.getMonth() + 1
    : null;

  $: year = viewDate.getFullYear();
  $: month = viewDate.getMonth() + 1;

  function updateSelectedValue() {
    if (selectedDate) {
      selectedValue = isDateMode
        ? selectedDate.getDate()
        : selectedDate.getMonth() + 1;
    } else {
      selectedValue = null;
    }
  }

  $: isSelectedDateVisible =
    selectedDate &&
    selectedDate.getFullYear() === year &&
    (isDateMode ? selectedDate.getMonth() + 1 === month : true);

  function getDaysInMonth(month: number, year: number): number {
    return new Date(year, month, 0).getDate();
  }

  let maxValue = isDateMode ? 31 : 12;
  let itemsPerPage = 7;
  let totalPages = Math.ceil(maxValue / itemsPerPage);
  let startValue = 1;
  let endValue = Math.min(itemsPerPage, maxValue);
  let actualItemWidth = minItemWidth;

  let items: number[] = [];

  for (let i = 0; i < Math.min(7, maxValue); i++) {
    items.push(i + 1);
  }

  function updateItems() {
    try {
      maxValue = isDateMode ? getDaysInMonth(month, year) : 12;

      const navButtonsWidth = 80;
      const itemGap = 8;
      const availableWidth = containerWidth
        ? containerWidth - navButtonsWidth
        : 220;

      const maxItemsVisible = Math.max(
        1,
        Math.floor((availableWidth + itemGap) / (minItemWidth + itemGap))
      );

      let targetItemsPerPage;

      if (isDateMode) {
        if (maxItemsVisible >= maxValue) {
          targetItemsPerPage = maxValue;
        } else if (maxItemsVisible >= 14) {
          targetItemsPerPage = maxItemsVisible;
        } else if (maxItemsVisible >= 7) {
          targetItemsPerPage = 7;
        } else if (maxItemsVisible >= 5) {
          targetItemsPerPage = 5;
        } else {
          targetItemsPerPage = Math.max(3, maxItemsVisible);
        }
      } else {
        if (maxItemsVisible >= 12) {
          targetItemsPerPage = 12;
        } else if (maxItemsVisible >= 6) {
          targetItemsPerPage = 6;
        } else if (maxItemsVisible >= 4) {
          targetItemsPerPage = 4;
        } else if (maxItemsVisible >= 3) {
          targetItemsPerPage = 3;
        } else {
          targetItemsPerPage = Math.max(1, maxItemsVisible);
        }
      }

      totalPages = Math.ceil(maxValue / targetItemsPerPage);

      const itemsPerPageFloor = Math.floor(maxValue / totalPages);
      const remainder = maxValue % totalPages;

      itemsPerPage = itemsPerPageFloor + (currentPage <= remainder ? 1 : 0);

      if (currentPage > totalPages) {
        currentPage = totalPages;
      }
      if (currentPage < 1) {
        currentPage = 1;
      }

      let itemsInPreviousPages = 0;
      for (let i = 1; i < currentPage; i++) {
        itemsInPreviousPages += itemsPerPageFloor + (i <= remainder ? 1 : 0);
      }

      startValue = itemsInPreviousPages + 1;
      endValue = startValue + itemsPerPage - 1;

      items = [];
      for (let i = startValue; i <= endValue; i++) {
        items.push(i);
      }

      if (items.length > 0) {
        const totalGapWidth = (items.length - 1) * itemGap;
        const availableWidthForItems = availableWidth - totalGapWidth;

        const calculatedWidth = Math.floor(
          availableWidthForItems / items.length
        );

        actualItemWidth = Math.max(minItemWidth, calculatedWidth);
      } else {
        actualItemWidth = minItemWidth;
      }
    } catch (error) {
      console.error("Error updating items:", error);
      maxValue = isDateMode ? getDaysInMonth(month, year) : 12;
      itemsPerPage = Math.min(7, maxValue);
      totalPages = Math.ceil(maxValue / itemsPerPage);
      startValue = 1;
      endValue = Math.min(itemsPerPage, maxValue);

      items = [];
      for (let i = startValue; i <= endValue; i++) {
        items.push(i);
      }

      actualItemWidth = minItemWidth;
    }
  }

  $: {
    isDateMode;
    year;
    month;
    currentPage;
    containerWidth;
    updateItems();
  }

  function findPageForValue(
    value: number,
    maxVal: number,
    totalPgs: number
  ): number {
    if (value === null || value === undefined) return 1;

    let targetPage = 1;
    let itemsCount = 0;

    for (let i = 1; i <= totalPgs; i++) {
      const itemsOnThisPage =
        Math.floor(maxVal / totalPgs) + (i <= maxVal % totalPgs ? 1 : 0);

      if (value > itemsCount && value <= itemsCount + itemsOnThisPage) {
        targetPage = i;
        break;
      }

      itemsCount += itemsOnThisPage;
    }

    return targetPage;
  }

  $: {
    if (date && previousDate && date.getTime() !== previousDate.getTime()) {
      viewDate = new Date(date);
      selectedDate = new Date(date);

      updateSelectedValue();

      updateItems();

      if (selectedValue !== null) {
        currentPage = findPageForValue(selectedValue, maxValue, totalPages);
      } else {
        currentPage = 1;
      }

      previousDate = new Date(date);
      updateItems();
    }
  }

  $: {
    if (previousMode !== isDateMode) {
      updateSelectedValue();

      updateItems();

      if (selectedValue !== null) {
        currentPage = findPageForValue(selectedValue, maxValue, totalPages);
      } else {
        currentPage = 1;
      }

      previousMode = isDateMode;
      dispatch("change", date);
      updateItems();
    }
  }

  onMount(() => {
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          if (entry.target === containerRef) {
            const newWidth = Math.round(entry.contentRect.width);

            if (Math.abs(newWidth - lastResizeWidth) < 10) {
              return;
            }

            if (resizeTimeout) {
              clearTimeout(resizeTimeout);
            }

            resizeTimeout = setTimeout(() => {
              if (newWidth !== containerWidth) {
                const oldSelectedValue = selectedValue;
                const oldItemsPerPage = itemsPerPage;
                lastResizeWidth = newWidth;

                containerWidth = newWidth;

                updateItems();

                const significantChange =
                  Math.abs(oldItemsPerPage - itemsPerPage) > 2;
                const selectedNotVisible =
                  selectedValue !== null &&
                  (selectedValue < startValue || selectedValue > endValue);

                if (significantChange || selectedNotVisible) {
                  if (selectedValue !== null) {
                    currentPage = findPageForValue(
                      selectedValue,
                      maxValue,
                      totalPages
                    );
                    updateItems();
                  }
                }
              }
              resizeTimeout = null;
            }, 150);
          }
        }
      });

      if (containerRef) {
        resizeObserver.observe(containerRef);
        lastResizeWidth = containerRef.clientWidth;
      }
    }

    setTimeout(() => {
      if (!containerWidth || containerWidth < 100) {
        containerWidth = 300;
      }
      lastResizeWidth = containerWidth;

      updateItems();

      if (selectedDate && isSelectedDateVisible && selectedValue !== null) {
        currentPage = findPageForValue(selectedValue, maxValue, totalPages);
        updateItems();
      }
    }, 0);

    return () => {
      if (resizeTimeout) {
        clearTimeout(resizeTimeout);
      }
      if (resizeObserver && containerRef) {
        resizeObserver.unobserve(containerRef);
        resizeObserver.disconnect();
      }
    };
  });

  $: canGoNext =
    currentPage < totalPages ||
    (isDateMode && month < 12) ||
    (isDateMode && month === 12 && year < 9999) ||
    (!isDateMode && year < 9999);
  $: canGoPrev =
    currentPage > 1 ||
    (isDateMode && month > 1) ||
    (isDateMode && month === 1 && year > 1) ||
    (!isDateMode && year > 1);

  let isNavigating = false;

  function handlePrevious() {
    if (canGoPrev) {
      isNavigating = true;

      if (currentPage > 1) {
        currentPage--;
        updateItems();
      } else if (isDateMode && month > 1) {
        const newMonth = month - 1;
        const newYear = year;

        viewDate = new Date(viewDate);
        viewDate.setFullYear(newYear);
        viewDate.setMonth(newMonth - 1);

        updateItems();
        currentPage = totalPages;
        updateItems();
      } else if (isDateMode && month === 1 && year > 1) {
        const newMonth = 12;
        const newYear = year - 1;

        viewDate = new Date(viewDate);
        viewDate.setFullYear(newYear);
        viewDate.setMonth(newMonth - 1);

        updateItems();
        currentPage = totalPages;
        updateItems();
      } else if (!isDateMode && year > 1) {
        viewDate = new Date(viewDate);
        viewDate.setFullYear(year - 1);

        updateItems();
        currentPage = totalPages;
        updateItems();
      }

      dispatch("pageChange", { page: currentPage, viewDate });
      isNavigating = false;
      updateItems();
    }
  }

  function handleNext() {
    if (canGoNext) {
      isNavigating = true;

      if (currentPage < totalPages) {
        currentPage++;
        updateItems();
      } else if (isDateMode && month < 12) {
        const newMonth = month + 1;
        const newYear = year;

        viewDate = new Date(viewDate);
        viewDate.setFullYear(newYear);
        viewDate.setMonth(newMonth - 1);

        currentPage = 1;
        updateItems();
      } else if (isDateMode && month === 12) {
        const newMonth = 1;
        const newYear = year + 1;

        viewDate = new Date(viewDate);
        viewDate.setFullYear(newYear);
        viewDate.setMonth(newMonth - 1);

        currentPage = 1;
        updateItems();
      } else if (!isDateMode) {
        viewDate = new Date(viewDate);
        viewDate.setFullYear(year + 1);

        currentPage = 1;
        updateItems();
      }

      dispatch("pageChange", { page: currentPage, viewDate });
      isNavigating = false;
      updateItems();
    }
  }

  function handleSelect(value: number) {
    if (isNavigating) return;

    const newDate = new Date(viewDate);

    if (isDateMode) {
      newDate.setDate(value);
    } else {
      newDate.setMonth(value - 1);
      newDate.setDate(1);
    }

    selectedDate = newDate;
    date = newDate;
    previousDate = new Date(newDate);

    selectedValue = value;

    dispatch("change", date);
  }

  const months = [
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
</script>

<div class="flex flex-col gap-2">
  <div
    class="flex items-center w-full"
    bind:clientWidth={containerWidth}
    bind:this={containerRef}
  >
    <button
      class={cn(
        "flex items-center justify-center rounded-full w-8 h-8 shrink-0",
        "hover:bg-bgs2 active:bg-bgs3",
        { "opacity-50 cursor-not-allowed": !canGoPrev }
      )}
      on:click={handlePrevious}
      disabled={!canGoPrev}
    >
      <Icon icon="chevleft" size={Size.sm} />
    </button>

    <div class="flex gap-2 flex-grow justify-center overflow-hidden">
      {#if items && items.length > 0}
        {#each items as item}
          <button
            class={cn(
              "flex items-center justify-center rounded-full h-8 text-b2 shrink-0",
              {
                "bg-aps1 text-abg":
                  isSelectedDateVisible && selectedValue === item,
                "hover:bg-bgs2 active:bg-bgs3":
                  !isSelectedDateVisible || selectedValue !== item
              }
            )}
            style="width: {actualItemWidth}px;"
            on:click={() => handleSelect(item)}
          >
            {isDateMode ? item : months[item - 1]}
          </button>
        {/each}
      {:else}
        <div class="flex items-center justify-center text-fgs3">Loading...</div>
      {/if}
    </div>

    <button
      class={cn(
        "flex items-center justify-center rounded-full w-8 h-8 shrink-0",
        "hover:bg-bgs2 active:bg-bgs3",
        { "opacity-50 cursor-not-allowed": !canGoNext }
      )}
      on:click={handleNext}
      disabled={!canGoNext}
    >
      <Icon icon="chevright" size={Size.sm} />
    </button>
  </div>
</div>
