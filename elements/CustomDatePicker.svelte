<script lang="ts">
  /**
   * INSTALL
   * yarn add dayjs
   *
   * USAGE
   * import DatePicker from './DatePicker.svelte'
   * function datepicked (e) { console.log(e.detail.datepicked) }
   *
   * <DatePicker
   *  on:datepicked={datepicked}
   *  customclass=""                  (facultative) css class
   * />
   */

  import { createEventDispatcher, onMount } from "svelte";
  //   import Arrows from "./Arrows.svelte";
  import Icon from "./Icon.svelte";
  import dayjs from "dayjs";
  import "dayjs/locale/en";

  // data
  const dispatch = createEventDispatcher();
  let elModal; // HTMLElement
  let inputTxt; // string, défault date = now
  // let decadeMode  = false; // true: show decade
  export let yearMode: boolean; // true: show year
  export let monthMode: boolean; // true: show month
  export let dayMode: boolean; // true: show day
  export let isOpenCalendar: boolean; // true: show calendar
  //  $:{ console.log("dayMode", dayMode);
  //   console.log("monthMode", monthMode);
  //   console.log("yearMode", yearMode);
  // }
  const arrDays = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
  // let startDay = +dayjs().format("D"); // 1..31
  // let startMonth = +dayjs().format("M"); // 1..12
  // let startYear = +dayjs().format("YYYY"); // 2021...
  // let endDay = +dayjs().format("D"); // 1..31
  // let endMonth = +dayjs().format("M"); // 1..12
  // let endYear = +dayjs().format("YYYY"); // 2021...
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
  let startDaySelected: boolean = false;
  let endDaySelected: boolean = false;
  let selectedDecade = Math.floor(mapYear / 10) * 10; // 2021...
  let rows;
  $: if (isOpenCalendar) {
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

  // props
  // export let customclass = "";

  // reactivity, on inputTxt changes
  // $: dispatch("datepicked", {
  //   datepicked: inputTxt,
  // });
  // $:dispatch("dateRange", {
  //   startDate: startString,
  //   endDate: endString,
  // });
  // $: dispatch("startDate", { startDate: startString });
  // $: dispatch("endDate", { endDate: endString });

  // life cycle
  onMount(() => {
    dayjs.locale("en"); // use locale
    inputTxt = dayjs().format("YYYY-MM-DD"); // current day month year in input
    if (dayMode) {
      changeRows();
    } else if (monthMode) {
      rows = initMonth();
    } else if (yearMode) {
      rows = initYear();
    }
    // document.addEventListener("click", handleOutsideClickModal);
    // return () => {
    //   document.removeEventListener("click", handleOutsideClickModal);
    // };
  });
  /**
   * @description Resets all start values or end values or both.
   * @param start
   * @param end
   */
  function reset(start: boolean = false, end: boolean = false) {
    if (start) {
      startDay = undefined;
      startMonth = undefined;
      startYear = undefined;
      startString = "";
      startDaySelected = false;
    }
    if (end) {
      endDay = undefined;
      endMonth = undefined;
      endYear = undefined;
      endString = "";
      endDaySelected = false;
    }
  }
  rese;
  function enablePicker() {
    thisDay = +dayjs().format("D"); // 1..31
    thisMonth = +dayjs().format("M"); // 1..12
    thisYear = +dayjs().format("YYYY");
    reset(true, true);
    // startDay = undefined;
    // startMonth = undefined;
    // startYear = undefined;
    // endDay = undefined;
    // endMonth = undefined;
    // endYear = undefined;
    // startDaySelected = false;
    // endDaySelected = false;

    isOpenCalendar = true;
  }
  // functions
  /**
   * Click outside of the modal will close it
   * @param e
   */
  function handleOutsideClickModal() {
    // console.log("handleOutsideClickModal", e.target);

    // console.log("elModal", elModal);
    // if (e.target === elModal) {
    console.log("RangePicked", { start: startString, end: endString });
    dispatch("rangePicked", { start: startString, end: endString });
    isOpenCalendar = false;
    startString = "";
    endString = "";
    // }
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
      console.log("dayMode");

      rows = initRows();

      const firstDayOfCurrentMonth = ucFirst(
        dayjs(mapYear + "-" + mapMonth)
          .startOf("month")
          .format("ddd")
      ).toUpperCase(); // 'Wed'

      console.log("firstDayOfCurrentMonth", firstDayOfCurrentMonth);
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
      console.log("monthMode");
      rows = initMonth();
    } else if (yearMode) {
      console.log("yearMode");
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
    // console.log("selectDate", y, m, d);
    // mapDay = +d
    // let mode = yearMode ? "yearMode" : monthMode ? "monthMode" : "dayMode";
    let date = y + "-" + m + "-" + d;
    if (startDaySelected == false || dayjs(date).isBefore(dayjs(startString))) {
      startDaySelected = true;
      startDay = +d;
      startMonth = +m;
      startYear = +y;
      // endDaySelected = false;
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
      // startDaySelected = false;
      endDaySelected = true;

      endString = dayMode
        ? dayjs(date).format("YYYY-MM-DD")
        : monthMode
          ? dayjs(date).format("YYYY-MM")
          : dayjs(date).format("YYYY");
    }

    inputTxt = dayjs(y + "-" + m + "-" + d).format("YYYY-MM-DD");
    // isOpenCalendar = false
    console.log(inputTxt);
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
  // function getDecade() {
  //   return   Math.floor(mapYear / 10) * 10;
  // }
  $: console.log(rows);
</script>

{#if isOpenCalendar}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- <div
    class="fixed z-40 left-0 top-0 w-full h-full overflow-auto bg-bgs3 text-texts1 border-8 border-orange-700"
    bind:this={elModal}
    on:click={handleOutsideClickModal}
  > -->
  <!-- <div
      class="flex items-center justify-center py-8 px-4 border border-blue-700"
    > -->
  <div class="max-w-sm w-full shadow-lg" on:click|stopPropagation>
    <div class="md:p-8 p-5 dark:bg-slate-300 bg-white rounded-t">
      <div class=" flex items-center justify-between pt-2">
        <button
          on:click={previousDecade}
          aria-label="calendar backward"
          class=""
        >
          <Icon icon="chevleft" color="black" />
          <!-- <Arrows direction="left" /> -->
        </button>
        <div class="px-4 w-full flex items-center justify-around">
          <!-- Month year -->

          <span
            class="focus:outline-none text-base font-medium bg-bgs1 rounded-md px-2 text-center"
            >{selectedDecade +
              "-" +
              ((selectedDecade + 10) % 100).toString()}</span
          >

          <button on:click={nextDecade} class="focus:outline-none text-base"
            >{(selectedDecade + 10).toString() +
              "-" +
              ((selectedDecade + 20) % 100).toString()}</button
          >
          <!-- bnt next -->
        </div>
        <button
          on:click={nextDecade}
          aria-label="calendar forward"
          class="ml-3"
        >
          <Icon icon="chevright" color="black" />
          <!-- <Arrows direction="right" /> -->
        </button>
      </div>
      {#if monthMode || dayMode}
        <div class=" flex items-center justify-between pt-2">
          <button
            on:click={() => {
              previousYear(1);
            }}
            aria-label="calendar backward"
            class=""
          >
            <Icon icon="chevleft" color="black" />
            <!-- <Arrows direction="left" /> -->
          </button>
          <div class="px-4 w-full flex items-center justify-around">
            <!-- Month year -->
            <button
              on:click={() => {
                previousYear(1);
              }}
              class="focus:outline-none text-base"
              >{ucFirst(
                dayjs(mapYear - 1 + "-" + mapMonth).format("YYYY")
              )}</button
            >

            <span
              class="focus:outline-none text-base font-medium bg-bgs1 rounded-md px-2 text-center"
              >{ucFirst(dayjs(mapYear + "-" + mapMonth).format("YYYY"))}</span
            >

            <button
              on:click={() => {
                nextYear(1);
              }}
              class="focus:outline-none text-base"
              >{ucFirst(
                dayjs(mapYear + 1 + "-" + mapMonth).format("YYYY")
              )}</button
            >
            <!-- bnt next -->
          </div>
          <button
            on:click={() => {
              nextYear(1);
            }}
            aria-label="calendar forward"
            class="ml-3"
          >
            <Icon icon="chevright" color="black" />
            <!-- <Arrows direction="right" /> -->
          </button>
        </div>
      {/if}

      {#if dayMode}
        <div class=" flex items-center justify-between pt-2">
          <button
            on:click={() => {
              previousMonth(1);
            }}
            aria-label="calendar backward"
            class=""
          >
            <Icon icon="chevleft" color="black" />
            <!-- <Arrows direction="left" /> -->
          </button>
          <div class="px-4 w-full flex items-center justify-around">
            <!-- Month year -->

            <button
              on:click={() => {
                previousMonth(1);
              }}
              class="focus:outline-none text-base"
              >{ucFirst(
                dayjs(mapYear + "-" + (mapMonth - 1).toString()).format("MMM")
              )}</button
            >

            <span
              class="focus:outline-none text-base font-medium bg-bgs1 rounded-md px-2 text-center"
              >{ucFirst(dayjs(mapYear + "-" + mapMonth).format("MMM"))}</span
            >
            <button
              on:click={() => {
                nextMonth(2);
              }}
              class="focus:outline-none text-base"
              >{ucFirst(
                dayjs(mapYear + "-" + (mapMonth + 1).toString()).format("MMM")
              )}</button
            >
            <button
              on:click={() => {
                nextMonth(2);
              }}
              class="focus:outline-none text-base"
              >{ucFirst(
                dayjs(mapYear + "-" + (mapMonth + 2).toString()).format("MMM")
              )}</button
            >
            <!-- bnt next -->
          </div>
          <button
            on:click={() => {
              nextMonth(1);
            }}
            aria-label="calendar forward"
            class="ml-3"
          >
            <Icon icon="chevright" color="black" />
            <!-- <Arrows direction="right" /> -->
          </button>
        </div>
        <div class="flex items-center justify-between pt-4 overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr>
                {#each arrDays as day}
                  <th>
                    <div class="w-full flex justify-center">
                      <p class="text-base font-medium text-center">
                        {day}
                      </p>
                    </div>
                  </th>
                {/each}
              </tr>
            </thead>
            <tbody>
              {#each rows as col}
                <tr>
                  {#each col as i}
                    <td class="">
                      <div
                        class="px-2 py-2 cursor-pointer flex w-full justify-center"
                      >
                        {#if i > 0}
                          {#if (i === startDay && mapMonth === startMonth && mapYear === startYear && startDaySelected) || (i === endDay && mapMonth === endMonth && mapYear === endYear && endDaySelected == true)}
                            <button
                              on:click={() => {
                                // mapDay=i;
                                console.log(
                                  "selectDate",
                                  i === startDay &&
                                    mapMonth === startMonth &&
                                    mapYear === startYear
                                );
                                console.log(
                                  "selectDate",
                                  i === endDay,
                                  mapMonth === endMonth,
                                  mapYear === endYear,
                                  startDaySelected == true
                                );
                                // selectDate(mapYear, mapMonth, i);
                              }}
                              class="rounded w-full h-full focus:ring-1 focus:ring-indigo-700 focus:bg-indigo-500 hover:bg-indigo-500 text-base flex items-center justify-center font-medium text-white bg-indigo-700"
                              >{i}</button
                            >
                          {:else if startDay && startMonth && startYear && laterDate(startDay, startMonth, startYear, i, mapMonth, mapYear) && endDay && endMonth && endYear && laterDate(i, mapMonth, mapYear, endDay, endMonth, endYear) && endDaySelected == true}
                            <p
                              class="text-base bg-indigo-400 font-medium w-full text-center"
                            >
                              <button
                                class="border-none w-full"
                                on:click={() => {
                                  selectDate(mapYear, mapMonth, i);
                                }}
                              >
                                {i}
                              </button>
                            </p>
                          {:else if i === thisDay && mapMonth === thisMonth && mapYear === thisYear}
                            <button
                              class="rounded-full w-full h-full focus:ring-1 focus:ring-indigo-700 focus:bg-indigo-500 hover:bg-indigo-500 text-base flex items-center justify-center font-medium text-white bg-pink-400"
                              on:click={() => {
                                selectDate(mapYear, mapMonth, i);
                              }}
                            >
                              {i}
                            </button>
                          {:else}
                            <p class="text-base font-medium">
                              <button
                                class="border-none"
                                on:click={() => {
                                  selectDate(mapYear, mapMonth, i);
                                }}
                              >
                                {i}
                              </button>
                            </p>
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

      {#if monthMode}
        <div class="flex items-center justify-between pt-4 overflow-x-auto">
          <!-- <div>{rows}</div> -->
          <table class="w-full">
            <tbody>
              {#each rows as col}
                <tr>
                  {#each col as i}
                    <td class="">
                      <div
                        class="px-2 py-2 cursor-pointer flex w-full justify-center"
                      >
                        {#if i > 0}
                          {#if (i === startMonth && mapYear === startYear) || (i === endMonth && mapYear === endYear && startDaySelected == false)}
                            <button
                              on:click={() => {
                                // mapDay=i;
                                selectDate(mapYear, i, 1);
                              }}
                              class="rounded w-full h-full focus:ring-1 focus:ring-indigo-700 focus:bg-indigo-500 hover:bg-indigo-500 text-base flex items-center justify-center font-medium text-white bg-indigo-700"
                              >{dayjs(mapYear + "-" + i).format("MMM")}</button
                            >
                          {:else if laterDate(1, startMonth, startYear, 1, i, mapYear) && laterDate(1, i, mapYear, 1, endMonth, endYear) && startDaySelected == false}
                            <p
                              class="text-base bg-accent1 font-medium w-full text-center"
                            >
                              <button
                                class="border-none w-full"
                                on:click={() => {
                                  selectDate(mapYear, i, 1);
                                }}
                              >
                                {dayjs(mapYear + "-" + i).format("MMM")}
                              </button>
                            </p>
                          {:else}
                            <p class="text-base font-medium">
                              <button
                                class="border-none"
                                on:click={() => {
                                  selectDate(mapYear, i, 1);
                                }}
                              >
                                {dayjs(mapYear + "-" + i).format("MMM")}
                              </button>
                            </p>
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
          <!-- <div>{rows}</div> -->
          <table class="w-full">
            <tbody>
              {#each rows as col}
                <tr>
                  {#each col as i}
                    <td class="">
                      <div
                        class="px-2 py-2 cursor-pointer flex w-full justify-center"
                      >
                        {#if i > -2}
                          {#if i + selectedDecade === startYear || (selectedDecade + i == endYear && startDaySelected == false)}
                            <button
                              on:click={() => {
                                // mapDay=i;
                                selectDate(selectedDecade + i, 1, 1);
                              }}
                              class="rounded w-full h-full focus:ring-1 focus:ring-indigo-700 focus:bg-indigo-500 hover:bg-indigo-500 text-base flex items-center justify-center font-medium text-white bg-indigo-700"
                            >
                              {selectedDecade + i}
                            </button>
                          {:else if laterDate(1, 1, startYear, 1, 1, selectedDecade + i) && laterDate(1, 1, selectedDecade + i, 1, 1, endYear) && startDaySelected == false}
                            <p
                              class="text-base font-medium w-full text-center bg-accent1"
                            >
                              <button
                                class="border-none w-full"
                                on:click={() => {
                                  selectDate(selectedDecade + i, 1, 1);
                                }}
                              >
                                {selectedDecade + i}
                              </button>
                            </p>
                          {:else}
                            <p class="text-base text-gray-500 font-medium">
                              <button
                                class="border-none"
                                on:click={() => {
                                  selectDate(selectedDecade + i, 1, 1);
                                }}
                              >
                                {selectedDecade + i}
                              </button>
                            </p>
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
      <div class="flex w-full justify-center pt-2">
        <div class=" h-0.5 w-4/5" />
      </div>
      <div class="flex justify-between">
        <div class="flex flex-col w-11/12">
          <div class="text-sm">Start</div>
          <div
            class="text-base bg-bgs4 font-light p-2 rounded-sm"
            on:click={() => reset(true, false)}
          >
            {startDaySelected ? startString : "select"}
          </div>
        </div>
        <Icon icon="arrow-rightedit" color="black" />
        <div class="flex flex-col w-11/12">
          <div class="text-sm">End</div>
          <div
            class="text-base bg-bgs4 font-light p-2 rounded-sm"
            on:click={() => reset(false, true)}
          >
            {endDaySelected ? endString : "select"}
          </div>
        </div>
      </div>
    </div>
  </div>
  <!-- </div> -->
  <!-- </div> -->
{:else}
  <button on:click|stopPropagation={enablePicker}>
    -- select a time period --
  </button>
{/if}
