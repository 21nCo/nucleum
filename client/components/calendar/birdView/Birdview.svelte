<script lang="ts">
  import { onMount, tick } from "svelte";
  import RollerPicker from "./RollerPicker.svelte";
  import Zone from "./Zone.svelte";
  import {
    Modes,
    type ProgrammedHorizontalWheelEvent,
    type ProgrammedVerticalWheelEvent
  } from "./Birdview.type";
  import {
    currentMonthIndex,
    currentYear,
    getISOfromDateString,
    scrollDateSlotIntoView,
    monthNames,
    getFirstAlphabetPosition,
    currentDate
  } from "./Birdview.utils";
  import PanelSwitcher from "$lib/client/elements/switcher/PanelSwitcher.svelte";
  import { PanelSwitcherStyle } from "$lib/client/types/switcher.enum";
  import Day from "./Day.svelte";
  import Month from "./Month.svelte";
  import Year from "./Year.svelte";
  import TodayButton from "./TodayButton.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import { debouncer } from "$lib/client/utils/utils";

  let startX: number;
  let instaceId = new Date().getTime();
  let handleDaysWheelEvent = (
    e: WheelEvent | ProgrammedVerticalWheelEvent
  ) => {};
  let handleMonthsWheelEvent = (
    e: WheelEvent | ProgrammedVerticalWheelEvent
  ) => {};
  let handleYearsWheelEvent = (
    e: WheelEvent | ProgrammedVerticalWheelEvent
  ) => {};
  let reverseScrollInAction: boolean = false;
  let isNotToday: boolean = false;
  let isMouseWheelMoveEnabled: boolean = false;
  let prevScrollLeft: number = 0;
  let prevScrollWidth: number = 0;
  let panelsContainer: HTMLDivElement;
  let dateInViewForward: string;
  let dateInViewReverse: string;
  let prevDateInViewReverse: string | null = null;
  let prevDateInViewForward: string | null = null;
  let engadged: boolean = false;
  let startPoint: any = null;
  let thresholdCrossed = false;
  let cursorDirection: "right" | "left" | "bidirectional" | "default" =
    "default";
  let mode: Modes = Modes.DAYS;
  const zones = [
    "6am-9am",
    "9am-12pm",
    "12pm-3pm",
    "3pm-6pm",
    "6pm-9pm",
    "9pm-12am"
  ];
  let zonesData: { date: string; data: string[] }[] = [];
  zonesData = generateZonesData(new Date().toISOString());
  let daysData = generateDaysData(currentYear, currentMonthIndex);
  let monthsData = generateMonthsData(currentYear);
  let yearsData = generateYearsData(currentYear);

  function generateYearsData(centerYear: number) {
    let i = centerYear - 5;
    let data = [];
    for (; i <= centerYear + 5; i++) {
      data.push(i);
    }
    return data;
  }
  function generateMonthsData(year: number) {
    let i = year - 1;
    let data = [];
    for (; i <= year + 1; i++) {
      data.push(i);
    }
    return data;
  }
  function generateDaysData(year: number, month: number) {
    let data = [];
    let j: number;
    month = month + 1 > 11 ? 0 : month + 1;
    if (month == 0) j = 10;
    else if (month == 1) j = 11;
    else j = month - 2;
    for (; j <= month; j = (j + 1) % 12) {
      let relevantYear: number;
      if (month == 0 && j == month) relevantYear = year + 1;
      else if (month == 1 && j == 11) relevantYear = year - 1;
      else relevantYear = year;
      data.push(
        ...Array.from(
          { length: new Date(Date.UTC(relevantYear, j + 1, 0)).getDate() },
          (_, i) => {
            let tmp = new Date(Date.UTC(relevantYear, j, i + 1))
              .toISOString()
              .split("T")[0];
            return tmp;
          }
        )
      );
    }
    return data;
  }
  function generateZonesData(centerDateString: string) {
    const centerDate = new Date(centerDateString);
    const numberOfDays = 7;
    const daysBeforeAfter = Math.floor(numberOfDays / 2);
    const startDate = new Date(centerDate);
    startDate.setDate(centerDate.getDate() - daysBeforeAfter);

    let data = [];
    for (let i = 0; i < numberOfDays; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);
      const dateStr = currentDate.toISOString().split("T")[0];
      const dataEntry = {
        date: dateStr,
        data: ["0", "1", "2", "3", "4", "5"]
      };
      data.push(dataEntry);
    }
    return data;
  }

  async function scrollLookAlike(isPositive: boolean) {
    let offset: number;
    const panelItemWidth = panelsContainer.children[0].clientWidth;
    const itemsToMove = 1;
    if (isPositive) offset = itemsToMove * panelItemWidth;
    else offset = -itemsToMove * panelItemWidth;
    // for (let i = 0; i < panelItemWidth; i += Math.abs(offset)) {
    //   panelsContainer.scrollLeft += offset;
    //   await tick();
    // }
    panelsContainer.scrollBy({ left: offset, behavior: "smooth" });
  }

  let i = 0;

  const addZoneDataEnd = (): Promise<void> =>
    new Promise(async (resolve, reject) => {
      let temp = new Date(zonesData[zonesData.length - 1].date);
      let date: any = new Date(temp.getTime() + 24 * 60 * 60 * 1000);
      date = date.toISOString().split("T")[0];
      zonesData = [
        ...zonesData,
        {
          date: `${date}`,
          data: (await getDummyDataAfterDelay()) as string[]
        }
      ];
      prevScrollWidth = panelsContainer.scrollWidth;
      resolve();
    });

  function adjustScrollOnDataAdditionStart() {
    let scrollWidthDiff = panelsContainer.scrollWidth - prevScrollWidth;
    panelsContainer.scrollLeft += scrollWidthDiff;
    prevScrollWidth = panelsContainer.scrollWidth;
  }
  function getDummyDataAfterDelay() {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(["0", "1", "2", "3", "4", "5"]);
      }, 500);
    });
  }
  const addZoneDataStart = (): Promise<void> =>
    new Promise(async (resolve, reject) => {
      reverseScrollInAction = true;
      let temp = new Date(zonesData[0].date);
      let date: any = new Date(temp.getTime() - 24 * 60 * 60 * 1000);
      date = date.toISOString().split("T")[0];
      zonesData = [
        {
          date: `${date}`,
          data: (await getDummyDataAfterDelay()) as string[]
        },
        ...zonesData
      ];
      await tick();
      adjustScrollOnDataAdditionStart();
      resolve();
      reverseScrollInAction = false;
    });

  const addFewDaysToStart = (days: number): Promise<void> =>
    new Promise(async (resolve, reject) => {
      reverseScrollInAction = true;
      let prevScrollLeft = panelsContainer.scrollLeft;
      const panelItemWidth = panelsContainer.children[0].clientWidth;
      if (panelsContainer.scrollWidth - panelItemWidth > prevScrollLeft)
        panelsContainer.scrollLeft = prevScrollLeft + panelItemWidth + 1;
      scrollLookAlike(false);
      let earliestDate = daysData[0];
      let [year, month, day] = earliestDate.split("-").map(Number);
      month = month - 1;
      for (let i = 1; i <= days; i++) {
        let date = new Date(Date.UTC(year, month, day - i));
        let newDateStr = date.toISOString().split("T")[0];
        daysData.pop();
        daysData.unshift(newDateStr);
      }
      daysData = daysData;
      await tick();
      resolve();
      reverseScrollInAction = false;
    });

  const addFewDaysToEnd = (days: number): Promise<void> =>
    new Promise(async (resolve, reject) => {
      let prevScrollLeft = panelsContainer.scrollLeft;
      const prevScrollWidth = panelsContainer.scrollWidth;
      const panelItemWidth = panelsContainer.children[0].clientWidth;
      if (panelsContainer.scrollWidth - panelItemWidth > prevScrollLeft)
        panelsContainer.scrollLeft = prevScrollLeft - panelItemWidth + 1;
      scrollLookAlike(true);
      let latestDate = daysData[daysData.length - 1];
      let [year, month, day] = latestDate.split("-").map(Number);
      month = month - 1;
      for (let i = 2; i <= days + 1; i++) {
        let date = new Date(year, month, day + i);
        let newDateStr = date.toISOString().split("T")[0];
        daysData.push(newDateStr);
        daysData.shift();
      }
      daysData = daysData;
      await tick();
      resolve();
    });
  const debouncedReverseScrollInAction = debouncer(
    () => (reverseScrollInAction = false),
    500
  );
  const addMonthDataStart = (): Promise<void> =>
    new Promise(async (resolve, reject) => {
      //TODO-remove Timeout when await based api data addition is added in all data addition locations
      reverseScrollInAction = true;
      setTimeout(async () => {
        monthsData = [monthsData[0] - 1, ...monthsData];
        if (monthsData.length > 12) monthsData.pop();
        await tick();
        adjustScrollOnDataAdditionStart();
        debouncedReverseScrollInAction();
        resolve();
      }, 500);
    });
  const addMonthDataEnd = (): Promise<void> =>
    new Promise(async (resolve, reject) => {
      monthsData = [...monthsData, monthsData[monthsData.length - 1] + 1];
      resolve();
    });

  const addYearDataStart = (): Promise<void> =>
    new Promise(async (resolve, reject) => {
      setTimeout(async () => {
        yearsData = [yearsData[0] - 1, ...yearsData];
        await tick();
        adjustScrollOnDataAdditionStart();
        resolve();
      }, 500);
    });
  const addYearDataEnd = (): Promise<void> =>
    new Promise(async (resolve, reject) => {
      yearsData = [...yearsData, yearsData[yearsData.length - 1] + 1];
      resolve();
    });
  function waitForReverseScrollInAction(): Promise<void> {
    return new Promise((resolve) => {
      const checkReverseScroll = setInterval(() => {
        if (!reverseScrollInAction) {
          clearInterval(checkReverseScroll);
          resolve();
        }
      }, 200);
    });
  }
  async function handlePanelScroll(
    e: WheelEvent | ProgrammedHorizontalWheelEvent
  ) {
    return new Promise<void>(async (resolve, reject) => {
      if (e instanceof WheelEvent) e.preventDefault();
      prevScrollWidth = panelsContainer.scrollWidth;
      checkVisibility();
      let deltaX;
      if (e.deltaX == undefined) {
        if (prevScrollLeft < panelsContainer.scrollLeft) {
          deltaX = 1;
        } else {
          deltaX = -1;
        }
      } else {
        deltaX = e.deltaX;
      }
      if (deltaX > 0) {
        if (!("isWheelEvent" in e) || e.isWheelEvent == true) {
          if (mode != Modes.DAYS) scrollLookAlike(true);
          if (reverseScrollInAction) {
            await waitForReverseScrollInAction();
            checkVisibility();
          }
          if (mode == Modes.ZONES) {
            if (
              dateInViewForward.split("-")[3] == "0" &&
              (prevDateInViewForward == null ||
                prevDateInViewForward != dateInViewForward)
            ) {
              prevDateInViewReverse = null;
              prevDateInViewForward = dateInViewForward;
              handleDaysWheelEvent({
                deltaY: 1,
                isWheelEvent: false,
                isPanelEvent: true
              });
            }
            addZoneDataEnd();
          } else if (mode == Modes.DAYS) {
            if (
              dateInViewForward.split("-")[2] == "01" &&
              (prevDateInViewForward == null ||
                prevDateInViewForward != dateInViewForward)
            ) {
              prevDateInViewReverse = null;
              prevDateInViewForward = dateInViewForward;
              handleMonthsWheelEvent({
                deltaY: 1,
                isWheelEvent: false,
                isPanelEvent: true
              });
            }
            addFewDaysToEnd(1);
          } else if (mode == Modes.MONTHS) {
            if (
              dateInViewForward.split("-")[1] == "01" &&
              (prevDateInViewForward == null ||
                prevDateInViewForward != dateInViewForward)
            ) {
              prevDateInViewReverse = null;
              prevDateInViewForward = dateInViewForward;
              handleYearsWheelEvent({
                deltaY: 1,
                isWheelEvent: false,
                isPanelEvent: true
              });
            }
            if (
              itemsInView[itemsInView.length - 1].split("-")[0] + 1 ==
              monthsData[0]
            )
              addMonthDataEnd();
          } else if (mode == Modes.YEARS) {
            addYearDataEnd();
          }
        }
      } else if (deltaX < 0) {
        if (!("isWheelEvent" in e) || e.isWheelEvent == true) {
          if (mode != Modes.DAYS) scrollLookAlike(false);
          if (mode == Modes.ZONES) {
            if (
              dateInViewReverse.split("-")[3] == "5" &&
              (prevDateInViewReverse == null ||
                prevDateInViewReverse != dateInViewReverse)
            ) {
              prevDateInViewForward = null;
              prevDateInViewReverse = dateInViewReverse;
              handleDaysWheelEvent({
                deltaY: -1,
                isWheelEvent: false,
                isPanelEvent: true
              });
            }
            addZoneDataStart();
          } else if (mode == Modes.DAYS) {
            if (
              dateInViewReverse?.split("-")[2] == "01" &&
              (prevDateInViewReverse == null ||
                prevDateInViewReverse != dateInViewReverse)
            ) {
              prevDateInViewForward = null;
              prevDateInViewReverse = dateInViewReverse;
              handleMonthsWheelEvent({
                deltaY: -1,
                isWheelEvent: false,
                isPanelEvent: true
              });
            }
            addFewDaysToStart(1);
          } else if (mode == Modes.MONTHS) {
            if (
              dateInViewForward.split("-")[1] == "01" &&
              (prevDateInViewReverse == null ||
                prevDateInViewReverse != dateInViewForward)
            ) {
              prevDateInViewForward = null;
              prevDateInViewReverse = dateInViewForward;
              handleYearsWheelEvent({
                deltaY: -1,
                isWheelEvent: false,
                isPanelEvent: true
              });
            }
            if (
              itemsInView[itemsInView.length - 1].split("-")[0] - 1 ==
              monthsData[0]
            )
              addMonthDataStart();
          } else if (mode == Modes.YEARS) {
            addYearDataStart();
          }
        }
      }
      prevScrollLeft = panelsContainer.scrollLeft;
      checkVisibility();
      setTimeout(() => {
        resolve();
      }, 300);
    });
  }

  async function waitUntilDisenganged(
    e: WheelEvent | ProgrammedHorizontalWheelEvent
  ): Promise<void> {
    return new Promise(async (resolve) => {
      if (engadged) return;
      engadged = true;
      await handlePanelScroll(e);
      engadged = false;
      resolve();
    });
  }
  function updateCursor(
    direction: "right" | "left" | "bidirectional" | "default"
  ) {
    switch (direction) {
      case "right":
        document.body.style.cursor = "url('/icons/arrow_forward.svg'), auto";
        break;
      case "left":
        document.body.style.cursor = "url('/icons/arrow_back.svg'), auto";
        break;
      case "bidirectional":
        document.body.style.cursor = "url('/icons/arrows_outward.svg'), auto";
        break;
      default:
        document.body.style.cursor = "default";
    }
  }
  function handleMouseWheelEnabled(e: MouseEvent) {
    startPoint = { x: e.clientX, y: e.clientY };
    thresholdCrossed = false;
    cursorDirection = "bidirectional";
    updateCursor(cursorDirection);
  }

  async function handleMouseMove(e: MouseEvent) {
    if (!startPoint) return;
    const movedX = e.clientX - startPoint.x;
    const threshold = 25;
    if (!thresholdCrossed && Math.abs(movedX) > threshold) {
      thresholdCrossed = true;
      cursorDirection = movedX > 0 ? "right" : "left";
      updateCursor(cursorDirection);
      if (cursorDirection == "right")
        while (thresholdCrossed) {
          await waitUntilDisenganged({ deltaX: 1, isWheelEvent: true });
        }
      else
        while (thresholdCrossed) {
          await waitUntilDisenganged({ deltaX: -1, isWheelEvent: true });
        }
    } else if (thresholdCrossed && Math.abs(movedX) <= threshold) {
      thresholdCrossed = false;
      updateCursor("bidirectional");
      return;
    }
  }

  function handleMouseWheelDisabled(e: MouseEvent) {
    startPoint = null;
    thresholdCrossed = false;
    cursorDirection = "default";
    updateCursor(cursorDirection);
  }
  function handleMouseDownOthers(event: MouseEvent) {
    if (isMouseWheelMoveEnabled) {
      document.removeEventListener("mousemove", handleMouseMove);
      isMouseWheelMoveEnabled = false;
      handleMouseWheelDisabled(event);
    }
  }
  function handleMouseDownOnPanelsContainer(event: MouseEvent) {
    if (event.button === 1) {
      event.preventDefault();
      event.stopPropagation();
      if (isMouseWheelMoveEnabled == false) {
        document.addEventListener("mousemove", handleMouseMove);
        handleMouseWheelEnabled(event);
      } else {
        document.removeEventListener("mousemove", handleMouseMove);
        handleMouseWheelDisabled(event);
      }
      isMouseWheelMoveEnabled = !isMouseWheelMoveEnabled;
    } else {
      event.stopPropagation();
      handleMouseDownOthers;
    }
  }
  async function goToToday() {
    let paddedCurrmonthIndex =
      (currentMonthIndex < 9 ? "0" : "") + (currentMonthIndex + 1);
    let paddedCurrDate =
      currentDate.getDate() < 10 ? "0" : "" + currentDate.getDate();
    let date: string | number;
    let index: number;
    prevDateInViewForward = null;
    prevDateInViewReverse = null;
    switch (mode) {
      case Modes.ZONES:
        date = currentYear + "-" + paddedCurrmonthIndex + "-" + paddedCurrDate;
        index = zonesData.findIndex((x) => {
          x.date == date;
        });
        if (index == -1) {
          zonesData = generateZonesData(new Date().toISOString());
          instaceId = new Date().getTime();
          await tick();
        }
        scrollDateSlotIntoView(
          currentYear + "-" + paddedCurrmonthIndex + "-" + paddedCurrDate + "-0"
        );
        break;
      case Modes.DAYS:
        date = currentYear + "-" + paddedCurrmonthIndex + "-" + paddedCurrDate;
        index = daysData.findIndex((x) => {
          x == date;
        });
        if (index == -1) {
          daysData = generateDaysData(currentYear, currentMonthIndex);
          instaceId = new Date().getTime();
          await tick();
        }
        scrollDateSlotIntoView(
          currentYear + "-" + paddedCurrmonthIndex + "-" + paddedCurrDate
        );
        break;
      case Modes.MONTHS:
        date = currentYear;
        index = monthsData.findIndex((x) => {
          x == date;
        });
        if (index == -1) {
          monthsData = generateMonthsData(currentYear);
          instaceId = new Date().getTime();
          await tick();
        }
        scrollDateSlotIntoView(currentYear + "-" + paddedCurrmonthIndex);
        break;
      case Modes.YEARS:
        scrollDateSlotIntoView(String(currentYear));
        break;
      default:
        break;
    }
  }

  function checkifNotToday(itemsInView: any[]): boolean {
    let currentDay = currentDate.getDate();
    switch (mode) {
      case Modes.ZONES:
        for (let i = 0; i < itemsInView.length; i++) {
          if (
            itemsInView[i].split("-")[0] == currentYear &&
            Number(itemsInView[i].split("-")[1]) == currentMonthIndex + 1 &&
            itemsInView[i].split("-")[2] == currentDay
          )
            return false;
        }
        return true;
      case Modes.DAYS:
        for (let i = 0; i < itemsInView.length; i++) {
          if (
            itemsInView[i].split("-")[0] == currentYear &&
            Number(itemsInView[i].split("-")[1]) == currentMonthIndex + 1 &&
            itemsInView[i].split("-")[2] == currentDay
          )
            return false;
        }
        return true;
      case Modes.MONTHS:
        for (let i = 0; i < itemsInView.length; i++) {
          if (
            itemsInView[i].split("-")[0] == currentYear &&
            Number(itemsInView[i].split("-")[1]) == currentMonthIndex + 1
          )
            return false;
        }
        return true;
      case Modes.YEARS:
        for (let i = 0; i < itemsInView.length; i++) {
          if (itemsInView[i] == currentYear) return false;
        }
        return true;
      default:
        return false;
    }
  }

  function handleTouchStart(e: TouchEvent) {
    startX = e.touches[0].clientX;
  }

  function handleTouchMove(e: TouchEvent) {
    const moveX = e.touches[0].clientX;
    const deltaX = startX - moveX;
    waitUntilDisenganged({ deltaX: deltaX, isWheelEvent: true });
    startX = moveX;
  }
  let itemsInView: any[] = [];

  function checkVisibility() {
    const containerLeft = panelsContainer.scrollLeft;
    const containerRight = containerLeft + panelsContainer.offsetWidth;
    itemsInView = [];

    Array.from(panelsContainer.children).forEach((child) => {
      const childLeft = child.offsetLeft;
      const childRight = childLeft + child.offsetWidth;

      if (childLeft < containerRight && childRight > containerLeft) {
        // The item is visible
        itemsInView.push(child.getAttribute("data-date"));
      }
    });
    dateInViewReverse = itemsInView[itemsInView.length - 2];
    dateInViewForward = itemsInView[itemsInView.length - 1];
    isNotToday = checkifNotToday(itemsInView);
  }

  onMount(async () => {
    prevScrollLeft = panelsContainer.scrollLeft;
    checkVisibility();
    if (mode == Modes.YEARS) {
      scrollDateSlotIntoView(String(currentYear));
    }

    panelsContainer.addEventListener("touchstart", handleTouchStart, {
      passive: true
    });
    panelsContainer.addEventListener("touchmove", handleTouchMove, {
      passive: false
    });
    panelsContainer.addEventListener("wheel", (e) => {
      e.preventDefault();
      waitUntilDisenganged(e);
    });
    panelsContainer.addEventListener(
      "mousedown",
      handleMouseDownOnPanelsContainer
    );
    document.addEventListener("mousedown", handleMouseDownOthers);
    return () => {
      panelsContainer.removeEventListener("touchstart", handleTouchStart);
      panelsContainer.removeEventListener("touchmove", handleTouchMove);
      panelsContainer.removeEventListener(
        "mousedown",
        handleMouseDownOnPanelsContainer
      );
      panelsContainer.removeEventListener("wheel", (e) => {
        e.preventDefault();
        waitUntilDisenganged(e);
      });
      document.removeEventListener("mousedown", handleMouseDownOthers);
      document.removeEventListener("mousemove", handleMouseMove);
    };
  });
</script>

<div
  class="relative flex flex-col max-w--[800px] max-h--[800px] w-full h-full min-h-[600px]"
>
  <div class="p-2 flex">
    <PanelSwitcher
      size={Size.sm}
      style={PanelSwitcherStyle.TRAIN}
      items={["Bird", "Classic", "Heatmap"]}
      value={"Bird"}
      on:switch={(e) => {
        console.log(e.detail);
      }}
    />
    {#if isNotToday}
      <TodayButton on:click={goToToday} />
    {/if}
  </div>
  <div class="flex h-full w-full overflow-auto">
    {#key mode && instaceId}
      {#if mode != Modes.YEARS}
        <RollerPicker
          {mode}
          on:selectedDateReset={async (e) => {
            const date = getISOfromDateString(e.detail);
            zonesData = generateZonesData(date);
            await tick();
            const dateToView = date.split("T")[0] + "-0";
            scrollDateSlotIntoView(dateToView);
          }}
          on:selectedDateChange={async (e) => {
            let date;
            if (typeof e.detail === "object" && "isPostive" in e.detail) {
              date = e.detail.selectedDate;
              if (e.detail.isPostive) {
                await addZoneDataEnd();
              } else {
                await addZoneDataStart();
              }
            } else {
              date = e.detail;
            }
            const dateToView = getISOfromDateString(date).split("T")[0] + "-0";
            scrollDateSlotIntoView(dateToView);
          }}
          on:selectedMonthReset={async (e) => {
            let date = e.detail;
            const month = monthNames.indexOf(date.slice(-3));
            const fistAlphIndex = getFirstAlphabetPosition(date);
            const year = Number(date.slice(0, fistAlphIndex));
            daysData = generateDaysData(year, month);
            await tick();
            const dateToView = new Date(Date.UTC(year, month, 1))
              .toISOString()
              .split("T")[0];
            scrollDateSlotIntoView(dateToView);
          }}
          on:selectedMonthChange={async (e) => {
            let date;
            if (typeof e.detail === "object" && "isPostive" in e.detail) {
              date = e.detail.selectedMonth + "01";
              if (e.detail.isPostive) {
                await addFewDaysToEnd(31);
              } else {
                await addFewDaysToStart(31);
              }
            } else {
              date = e.detail + "01";
            }
            const dateToView = getISOfromDateString(date).split("T")[0];
            scrollDateSlotIntoView(dateToView);
            checkVisibility();
          }}
          on:selectedYearChange={async (e) => {
            let date;
            if (typeof e.detail === "object" && "isPostive" in e.detail) {
              date = e.detail.selectedYear + "-01";
              if (e.detail.isPostive) {
                monthsData = [
                  ...monthsData,
                  monthsData[monthsData.length - 1] + 1
                ];
              } else {
                monthsData = [monthsData[0] - 1, ...monthsData];
                await tick();
              }
            } else {
              date = e.detail + "-01";
            }
            scrollDateSlotIntoView(date);
          }}
          on:mount={async (e) => {
            handleDaysWheelEvent = e.detail.handleDaysWheelEvent;
            handleMonthsWheelEvent = e.detail.handleMonthsWheelEvent;
            handleYearsWheelEvent = e.detail.handleYearsWheelEvent;
            await tick();
            checkVisibility();
          }}
        />
      {/if}
    {/key}
    <div
      id="birdViewPanelsContainer"
      class="flex w-full overflow-y-hidden overflow-x-hidden"
      bind:this={panelsContainer}
    >
      {#if mode == Modes.ZONES}
        {#each zonesData as day, index (index)}
          {#each day.data as zoneData, i (i)}
            {@const date = day.date}
            <Zone
              date={date + "-" + i}
              header={zones[i] + (i == 0 ? ` - ${date.split("-")[2]}` : "")}
              data={date + " - " + zoneData}
            />
          {/each}
        {/each}
      {/if}
      {#if mode == Modes.DAYS}
        {#each daysData as day, index (index)}
          {@const date = day}
          {#key day}
            <Day {date} />
          {/key}
        {/each}
      {/if}
      {#if mode == Modes.MONTHS}
        {#each monthsData as year (year)}
          {#each monthNames as month, i (i)}
            {@const date = year + month}
            <Month {date} />
          {/each}
        {/each}
      {/if}
      {#if mode == Modes.YEARS}
        {#each yearsData as year (year)}
          <Year {year} />
        {/each}
      {/if}
    </div>
  </div>
  <div
    class="absolute w-full p-4 bottom-0 flex items-center justify-center pointer-events-none"
  >
    <div class="pointer-events-auto">
      <PanelSwitcher
        style={PanelSwitcherStyle.TRAIN}
        items={Object.values(Modes)}
        size={Size.sm}
        value={mode}
        on:switch={async (e) => {
          mode = e.detail;
          await tick();
          goToToday();
        }}
      />
    </div>
  </div>
</div>
