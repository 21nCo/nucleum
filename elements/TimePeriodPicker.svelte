<script lang="ts">
  import { createEventDispatcher, onMount } from "svelte";
  import Divider from "./Divider.svelte";
  import Icon from "./Icon.svelte";
  import dayjs from "dayjs";
  import "dayjs/locale/en";
  import { Size } from "../types/size.enum";
  import { TimeScale } from "../types/time.type";
  const dispatch = createEventDispatcher();
  // let decadeMode  = false; // true: show decade
  export let scale: TimeScale.DAYS | TimeScale.MONTHS | TimeScale.YEARS;
  let yearMode: boolean = scale === TimeScale.YEARS;
  let monthMode: boolean = scale === TimeScale.MONTHS;
  let dayMode: boolean = scale === TimeScale.DAYS;
  export let isPickerOpen: boolean = false; // true: show picker
  const arrDays = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
  let thisDay = +dayjs().format("D"); // 1..31
  let thisMonth = +dayjs().format("M"); // 1..12
  let thisYear = +dayjs().format("YYYY"); // 2021...
  let mapDay = +dayjs().format("D"); // 1..31
  let mapMonth = +dayjs().format("M"); // 1..12
  let mapYear = +dayjs().format("YYYY"); // 2021...
  let startDay: number | undefined = undefined;
  let startMonth: number | undefined = undefined;
  let startYear: number | undefined = undefined;
  let endDay: number | undefined = undefined;
  let endMonth: number | undefined = undefined;
  let endYear: number | undefined = undefined;
  let startString = "";
  let endString = "";
  let startSelected: boolean = false;
  let endSelected: boolean = false;
  let selectedDecade = Math.floor(mapYear / 10) * 10; // 2021...
  let rows: any;
  let monthPool: any[] = [mapMonth - 1, mapMonth, mapMonth + 1, mapMonth + 2];
  $: if (isPickerOpen) {
    document.addEventListener("click", handleOutsideClickModal);
  } else {
    document.removeEventListener("click", handleOutsideClickModal);
  }
  $: if (monthMode) {
    rows = initMonth();
  } else if (yearMode) {
    rows = initYear();
  } else {
    changeRows();
  }
  let getDecade = () => {
    selectedDecade = Math.floor(mapYear / 10) * 10;
  };

  onMount(() => {
    dayjs.locale("en"); // use locale
    if (dayMode) {
      changeRows();
    } else if (monthMode) {
      rows = initMonth();
    } else if (yearMode) {
      rows = initYear();
    }
  });
  /**
   * @description closure to remember initialized or previously passed value to handle the monthPool change for the month range slider
   * @param index
   */
  let handlePoolChange = (function () {
    let previousIndex = 1;
    return function (index?: number) {
      if (index !== undefined) {
        previousIndex = index;
        changeRows();
      } else {
        monthPool.forEach((m, i) => {
          monthPool[i] = mapMonth - (previousIndex - i);
        });
      }
    };
  })();
  /**
   * @description Resets all start values or all end values or both.
   * @param start
   * @param end
   */
  function reset(start: boolean = false, end: boolean = false) {
    if (start) {
      startDay = undefined;
      startMonth = undefined;
      startYear = undefined;
      startString = "";
      startSelected = false;
    }
    if (end) {
      endDay = undefined;
      endMonth = undefined;
      endYear = undefined;
      endString = "";
      endSelected = false;
    }
  }

  /**
   * @description resets all start and end variables, reset picker current range and view, sets current date and opens the picker.
   */
  function enablePicker() {
    mapDay = +dayjs().format("D");
    mapMonth = +dayjs().format("M");
    mapYear = +dayjs().format("YYYY");
    reset(true, true);
    getDecade();
    changeRows();
    isPickerOpen = true;
  }

  /**
   *@description  Dispatches range picked if exists, closes the picker and resets the start and end values.
   *
   */
  function handleOutsideClickModal() {
    // console.log("RangePicked", { start: startString, end: endString });
    if (startString && endString)
      dispatch("rangePicked", { start: startString, end: endString });
    isPickerOpen = false;
    startString = "";
    endString = "";
  }

  function initRows() {
    return [
      [0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0]
    ];
  }

  function changeRows() {
    if (dayMode) {
      rows = initRows();

      const firstDayOfCurrentMonth = ucFirst(
        dayjs(mapYear + "-" + mapMonth)
          .startOf("month")
          .format("ddd")
      ).toUpperCase(); // 'Wed'
      const lastDayOfCurrentMonth = +dayjs(mapYear + "-" + mapMonth)
        .endOf("month")
        .format("D"); // 31
      let iRow = 0;
      let iCol = 0;
      let start = false;
      let cpt = 0;
      for (iRow = 0; iRow < 6; iRow++) {
        arrDays.forEach((daystr: String) => {
          if (cpt > lastDayOfCurrentMonth) {
            return;
          }
          if (!start && daystr === firstDayOfCurrentMonth) {
            cpt++;
            start = true;
          }
          rows[iRow][iCol] = cpt;
          iCol++;
          if (start) {
            cpt++;
          }
        });
        iCol = 0;
      }
    } else if (monthMode) {
      rows = initMonth();
    } else if (yearMode) {
      rows = initYear();
    }
  }
  function initMonth() {
    return [
      [1, 2, 3, 4],
      [5, 6, 7, 8],
      [9, 10, 11, 12]
    ];
  }
  function initYear() {
    return [
      [-1, 0, 1, 2],
      [3, 4, 5, 6],
      [7, 8, 9, 10]
    ];
  }

  function ucFirst(str: string) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
  function previousDecade() {
    selectedDecade--;
    previousYear(10);
    // changeRows()
  }

  function previousMonth(decreaseConst: number) {
    mapMonth -= decreaseConst;
    if (mapMonth <= 0) {
      mapMonth += 12;
      mapYear--;
      getDecade();
    }
    changeRows();
    handlePoolChange();
  }
  function previousYear(decreaseConst: number) {
    mapYear -= decreaseConst;
    getDecade();
    changeRows();
  }

  function nextMonth(increaseConst: number) {
    mapMonth += increaseConst;
    if (mapMonth > 12) {
      mapMonth = increaseConst % 12;
      mapYear++;
      getDecade();
    }
    changeRows();
    handlePoolChange();
  }
  function nextYear(increaseConst: number) {
    mapYear += increaseConst;
    getDecade();
    changeRows();
  }
  function nextDecade() {
    selectedDecade++;
    nextYear(10);
  }
  function selectDate(y: number, m: number, d: number) {
    let date = y + "-" + m + "-" + d;
    if (startSelected == false || dayjs(date).isBefore(dayjs(startString))) {
      startSelected = true;
      startDay = +d;
      startMonth = +m;
      startYear = +y;
      // endSelected = false;
      startString = dayMode
        ? dayjs(date).format("YYYY-MM-DD")
        : monthMode
          ? dayjs(date).format("YYYY-MM")
          : dayjs(date).format("YYYY");
    } else {
      endDay = +d;
      endMonth = +m;
      endYear = +y;
      if (monthMode) {
        endDay = +dayjs(y + "-" + m)
          .endOf("month")
          .format("D"); // 31
      }
      if (yearMode) {
        endDay = 31;
        endMonth = 12;
      }
      // startSelected = false;
      endSelected = true;

      endString = dayMode
        ? dayjs(date).format("YYYY-MM-DD")
        : monthMode
          ? dayjs(date).format("YYYY-MM")
          : dayjs(date).format("YYYY");
    }
  }
  function laterDate(
    d: number,
    m: number,
    y: number,
    nd: number,
    nm: number,
    ny: number
  ) {
    let curDate = dayjs(y + "-" + m + "-" + d).format("YYYY-MM-DD");
    let nextDate = dayjs(ny + "-" + nm + "-" + nd).format("YYYY-MM-DD");
    if (curDate < nextDate) {
      return true;
    } else {
      return false;
    }
  }
</script>

{#if isPickerOpen}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <div
    class="w-72 px-4 py-4 bg-bgs2 text-fgs3 rounded-t shadow-lg"
    on:click|stopPropagation
  >
    <div class="flex items-center justify-between text-sm">
      <button on:click={previousDecade} aria-label="calendar backward">
        <Icon icon="chevleft" color="black" size={Size.sm} />
      </button>
      <div class="flex place-self-center">
        <span
          class="focus:outline-none bg-bgs4 rounded-md px-2 mr-4 text-center"
          >{selectedDecade + "-" + (selectedDecade + 10)}</span
        >

        <button on:click={nextDecade} class="focus:outline-none"
          >{selectedDecade + 10 + "-" + (selectedDecade + 20)}</button
        >
      </div>
      <button on:click={nextDecade} aria-label="calendar forward">
        <Icon icon="chevright" color="black" size={Size.sm} />
      </button>
    </div>
    {#if monthMode || dayMode}
      <div class="flex items-center justify-between pt-2 text-sm">
        <button
          on:click={() => {
            previousYear(3);
          }}
          aria-label="calendar backward"
        >
          <Icon icon="chevleft" color="black" size={Size.sm} />
        </button>
        <div class="px-4 w-full flex items-center justify-around">
          <button
            on:click={() => {
              previousYear(1);
            }}
            class="focus:outline-none"
            >{ucFirst(
              dayjs(mapYear - 1 + "-" + mapMonth).format("YYYY")
            )}</button
          >

          <span class="focus:outline-none bg-bgs4 rounded-md px-2 text-center"
            >{ucFirst(dayjs(mapYear + "-" + mapMonth).format("YYYY"))}</span
          >

          <button
            on:click={() => {
              nextYear(1);
            }}
            class="focus:outline-none"
            >{ucFirst(
              dayjs(mapYear + 1 + "-" + mapMonth).format("YYYY")
            )}</button
          >
        </div>
        <button
          on:click={() => {
            nextYear(3);
          }}
          aria-label="calendar forward"
        >
          <Icon icon="chevright" color="black" size={Size.sm} />
        </button>
      </div>
    {/if}

    {#if dayMode}
      <div class="flex items-center text-sm justify-between pt-2">
        <button
          on:click={() => {
            previousMonth(4);
          }}
          aria-label="calendar backward"
        >
          <Icon icon="chevleft" color="black" size={Size.sm} />
        </button>
        <div class="px-4 w-full flex items-center justify-around">
          {#each monthPool as month, index (month)}
            <button
              on:click={() => {
                mapMonth = monthPool[index];
                handlePoolChange(index);
              }}
              class="focus:outline-none {mapMonth == monthPool[index]
                ? 'font-medium bg-bgs4 rounded-md px-2 text-center'
                : ''}"
              >{ucFirst(
                dayjs(mapYear + "-" + monthPool[index]).format("MMM")
              )}</button
            >
          {/each}
        </div>
        <button
          on:click={() => {
            nextMonth(4);
          }}
          aria-label="calendar forward"
        >
          <Icon icon="chevright" color="black" size={Size.sm} />
        </button>
      </div>
      <div class="flex pt-2">
        <table class="w-full text-xs" cellpadding="0">
          <thead>
            <tr>
              {#each arrDays as day}
                <td>
                  <div class="flex w-full p-2 justify-center">
                    <p class="text-center" style="font-size: xx-small;">
                      {day}
                    </p>
                  </div>
                </td>
              {/each}
            </tr>
          </thead>
          <tbody>
            {#each rows as col}
              <tr>
                {#each col as i}
                  <td>
                    <div class="flex w-full h-8 justify-center items-center">
                      {#if i > 0}
                        {#if (i === startDay && mapMonth === startMonth && mapYear === startYear && startSelected) || (i === endDay && mapMonth === endMonth && mapYear === endYear && endSelected)}
                          <button
                            class="rounded w-full h-full focus:ring-1 focus:opacity-80 hover:opacity-80 text-sm flex items-center justify-center text-bgs1 bg-aps1"
                            >{i}</button
                          >
                        {:else if startDay && startMonth && startYear && laterDate(startDay, startMonth, startYear, i, mapMonth, mapYear) && endDay && endMonth && endYear && laterDate(i, mapMonth, mapYear, endDay, endMonth, endYear) && endSelected == true}
                          <button
                            class="w-full h-full flex items-center justify-center hover:bg-aps1 hover:text-bgs1 text-sm text-bgs1 bg-aps2"
                            on:click={() => {
                              selectDate(mapYear, mapMonth, i);
                            }}
                          >
                            {i}
                          </button>
                        {:else if i === thisDay && mapMonth === thisMonth && mapYear === thisYear}
                          <button
                            class="rounded-full w-7 h-7 focus:ring-1 focus:opacity-90 hover:bg-aps1 hover:text-bgs1 text-base flex items-center justify-center font-medium text-bgs1 bg-ass1"
                            on:click={() => {
                              selectDate(mapYear, mapMonth, i);
                            }}
                          >
                            {i}
                          </button>
                        {:else}
                          <button
                            class="rounded w-full h-full focus:ring-1 focus:opacity-80 hover:bg-aps1 hover:text-bgs1 flex items-center justify-center"
                            on:click={() => {
                              selectDate(mapYear, mapMonth, i);
                            }}
                          >
                            {i}
                          </button>
                        {/if}
                      {/if}
                    </div>
                  </td>{/each}
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}

    {#if monthMode}
      <div
        class="flex items-center justify-between pt-4 text-fgs3 overflow-x-auto"
      >
        <table class="w-full" cellpadding="0">
          <tbody>
            {#each rows as col}
              <tr>
                {#each col as i}
                  <td>
                    <div class="flex w-full h-8 justify-center">
                      {#if i > 0}
                        {#if (i === startMonth && mapYear === startYear && startSelected) || (i === endMonth && mapYear === endYear && endSelected)}
                          <button
                            class="rounded w-full h-full focus:ring-1focus:opacity-80 hover:opacity-80 text-sm flex items-center justify-center text-bgs1 bg-aps1"
                            >{dayjs(mapYear + "-" + i).format("MMM")}</button
                          >
                        {:else if startMonth && startYear && laterDate(1, startMonth, startYear, 1, i, mapYear) && endMonth && endYear && laterDate(1, i, mapYear, 1, endMonth, endYear) && endSelected == true}
                          <button
                            class=" bg-aps2 text-bgs1 w-full text-sm text-center hover:bg-aps1 hover:text-bgs1"
                            on:click={() => {
                              selectDate(mapYear, i, 1);
                            }}
                          >
                            {dayjs(mapYear + "-" + i).format("MMM")}
                          </button>
                        {:else if i === thisMonth && mapYear === thisYear}
                          <button
                            class="rounded-full w-full h-full focus:ring-1 focus:bg-aps1 hover:bg-aps1 hover:text-white flex items-center justify-center text-sm text-bgs1 bg-ass1"
                            on:click={() => {
                              selectDate(mapYear, i, 1);
                            }}
                          >
                            {dayjs(mapYear + "-" + i).format("MMM")}
                          </button>
                        {:else}
                          <button
                            class="rounded w-full h-full focus:ring-1 focus:opacity-80 hover:bg-aps1 hover:text-bgs1 text-sm flex items-center justify-center"
                            on:click={() => {
                              selectDate(mapYear, i, 1);
                            }}
                          >
                            {dayjs(mapYear + "-" + i).format("MMM")}
                          </button>
                        {/if}
                      {/if}
                    </div>
                  </td>
                {/each}
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
    {#if yearMode}
      <div class="flex items-center justify-between pt-4 overflow-x-auto">
        <table class="w-full" cellpadding="0">
          <tbody>
            {#each rows as col}
              <tr>
                {#each col as i}
                  <td>
                    <div class="flex w-full h-8 justify-center">
                      {#if i > -2}
                        {#if (i + selectedDecade === startYear && startSelected) || (selectedDecade + i == endYear && endSelected)}
                          <button
                            class="rounded w-full h-full focus:ring-1 focus:opacity-80 hover:opacity-80 text-sm flex items-center justify-center text-bgs1 bg-aps1"
                          >
                            {selectedDecade + i}
                          </button>
                        {:else if startYear && laterDate(1, 1, startYear, 1, 1, selectedDecade + i) && endYear && laterDate(1, 1, selectedDecade + i, 1, 1, endYear) && endSelected == true}
                          <button
                            class="rounded w-full h-full focus:ring-1 focus:bg-aps1 text-bgs1 bg-aps2 text-sm flex items-center justify-center hover:text-bgs1 hover:bg-aps1"
                            on:click={() => {
                              selectDate(selectedDecade + i, 1, 1);
                            }}
                          >
                            {selectedDecade + i}
                          </button>
                        {:else if i + selectedDecade === thisYear}
                          <button
                            class="rounded-full w-full h-full focus:ring-1 focus:bg-aps1 hover:bg-aps1 text-sm flex items-center justify-center text-bgs1 bg-ass1"
                            on:click={() => {
                              selectDate(mapYear, i, 1);
                            }}
                          >
                            {selectedDecade + i}
                          </button>
                        {:else}
                          <button
                            class="rounded w-full h-full focus:ring-1 focus:bg-aps1 focus:text-bgs1 text-sm flex items-center justify-center hover:text-bgs1 hover:bg-aps1"
                            on:click={() => {
                              selectDate(selectedDecade + i, 1, 1);
                            }}
                          >
                            {selectedDecade + i}
                          </button>
                        {/if}
                      {/if}
                    </div>
                  </td>
                {/each}
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
    <Divider />
    <div class="flex justify-between pt-1">
      <div class="flex flex-col w-4/10">
        <div class="text-sm">Start</div>
        <div class="text-sm bg-bgs4 text-fgs3 p-1 rounded-sm">
          {#if startSelected}
            {startString}<button
              ><Icon
                icon="cross-circled"
                size={Size.xs}
                color="red"
                on:click={() => reset(true, false)}
              /></button
            >
          {:else}
            {"-/-"}
          {/if}
        </div>
      </div>
      <Icon icon="arrow-right" color="black" />
      <div class="flex flex-col w-4/10">
        <div class="text-sm">End</div>
        <div class="text-sm bg-bgs4 text-fgs3 p-1 rounded-sm">
          {#if endSelected}
            {endString}<button
              ><Icon
                icon="cross-circled"
                size={Size.xs}
                color="red"
                on:click={() => reset(false, true)}
              /></button
            >
          {:else}
            -/-
          {/if}
        </div>
      </div>
    </div>
  </div>
{:else}
  <button on:click|stopPropagation={enablePicker} class="text-fgs1">
    -- Pick Range --
  </button>
{/if}
