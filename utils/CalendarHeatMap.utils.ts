import type {
  DailyData,
  MonthlyData,
  YearlyData
} from "../types/CalendarHeatMapData.type";
import { TileAppearance } from "$lib/tidy/types/CalendarHeatMap.enum";
import {
  CalendarHeatMapData,
  CalendarHeatMapstoreColors,
  PlainCSSHMColorIndex5,
  calendarHmContext,
  userPreferences
} from "../stores/app.store";
import { get } from "svelte/store";
import { Persistance } from "../stores/persistance";
import { isValidArrayWithData } from "./obj.utils";
import { heatMapColorRange } from "./theme.utils";
const defaultTarget = null;
let persistance = new Persistance();
let profileStartdate = "2023-02-19"; //replace the value with with logs start date variable
let profileStartmonth = profileStartdate.slice(0, 7); //*important don't delete even if it shows value never used
let profileStartyear = profileStartdate.slice(0, 4); //*important don't delete even if it shows value never used
let currentdate = new Date().toISOString().split("T")[0];
let currentmonth = currentdate.slice(0, 7); //*important don't delete even if it shows value never used
let currentyear = currentdate.slice(0, 4); //*important don't delete even if it shows value never used
function getprevDateRange(
  months = 12,
  currentDate = new Date()
): {
  firstMonthEndDate: Date;
  lastMonthStartDate: Date;
} {
  let result: { firstMonthEndDate: Date; lastMonthStartDate: Date } = {
    firstMonthEndDate: new Date(),
    lastMonthStartDate: new Date()
  };

  const lastDayOfLastMonth = new Date(
    Date.UTC(
      currentDate.getUTCFullYear(),
      currentDate.getUTCMonth() - months + 1,
      0
    )
  );

  const firstDayOfNextMonth = new Date(
    Date.UTC(currentDate.getUTCFullYear(), currentDate.getUTCMonth() + 1, 1)
  );

  result.firstMonthEndDate = lastDayOfLastMonth;

  result.lastMonthStartDate = firstDayOfNextMonth;

  return result;
}
function getNextDateRange(
  months = 12,
  currentDate = new Date()
): {
  firstMonthEndDate: Date;
  lastMonthStartDate: Date;
} {
  let result: { firstMonthEndDate: Date; lastMonthStartDate: Date } = {
    firstMonthEndDate: new Date(),
    lastMonthStartDate: new Date()
  };

  const lastDayOfCurrentMonth = new Date(
    Date.UTC(currentDate.getUTCFullYear(), currentDate.getUTCMonth() + 1, 0)
  );

  const firstDayOfNextMonth = new Date(
    Date.UTC(
      currentDate.getUTCFullYear(),
      currentDate.getUTCMonth() + months + 1,
      1
    )
  );

  result.firstMonthEndDate = lastDayOfCurrentMonth;

  result.lastMonthStartDate = firstDayOfNextMonth;

  return result;
}
function getYearRange(year: number): {
  lastYearEndDate: Date;
  nextYearStartDate: Date;
} {
  const lastYearEndDate = new Date(Date.UTC(year, 0, 0));
  const nextYearStartDate = new Date(Date.UTC(year + 1, 0, 1));
  return {
    lastYearEndDate,
    nextYearStartDate
  };
}
function getRandomValue(min = 0, max = 10) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
let data: DailyData[] = [];
function generateDailyDataInRange(startDate: Date, endDate: Date) {
  const data: DailyData[] = [];

  const start = new Date(startDate);
  const end = new Date(endDate);

  for (let date = start; date <= end; date.setDate(date.getDate() + 1)) {
    data.push({
      date: date.toISOString().split("T")[0],
      value: 0 //getRandomValue()
    });
  }

  return data;
}
function generateMonthlyDataInRange(
  startYear: number,
  endYear: number
): MonthlyData[] {
  const monthlyData: MonthlyData[] = [];
  let monthString = `${(startYear - 1).toString()}-${(12)
    .toString()
    .padStart(2, "0")}`;
  let data: MonthlyData = {
    month: monthString,
    value: getRandomValue(90, 300)
  };
  monthlyData.push(data);
  for (let year = startYear; year <= endYear; year++) {
    for (let month = 1; month <= 12; month++) {
      monthString = `${year.toString()}-${month.toString().padStart(2, "0")}`;
      data = {
        month: monthString,
        value: getRandomValue(90, 300) //change to zero by default
      };
      monthlyData.push(data);
    }
  }
  monthString = `${(endYear + 1).toString()}-${(1)
    .toString()
    .padStart(2, "0")}`;
  data = {
    month: monthString,
    value: getRandomValue(90, 300) //change to zero by default
  };
  monthlyData.push(data);
  return monthlyData;
}
function generateYearlyDataInRange(
  startYear: number,
  endYear: number
): YearlyData[] {
  const yearlyData: YearlyData[] = [];
  for (let year = startYear - 1; year <= endYear + 1; year++) {
    const yearlyValue = getRandomValue(2900, 3600);
    const data: YearlyData = {
      year: year,
      value: yearlyValue
    };
    yearlyData.push(data);
  }
  return yearlyData;
}
function checkStreakDisplay(prev: any, curr: any, next: any, target: number) {
  if (
    (prev == null || prev.value < target) &&
    next !== null &&
    next.value >= target
  ) {
    return Number(TileAppearance.FTile);
  } else if (prev != null && prev.value >= target) {
    if (next !== null && next.value >= target) {
      return Number(TileAppearance.MTile);
    } else {
      return Number(TileAppearance.LTile);
    }
  } else {
    return Number(TileAppearance.DEFAULT);
  }
}

function findTileColorAndAppearance(
  prev: any,
  tileItem: any,
  next: any,
  target: number,
  colors: string[]
) {
  let noOfColors = colors.length; //exluding the base color
  let variantRange = target / (noOfColors - 2);
  if (tileItem.value > target) {
    return [checkStreakDisplay(prev, tileItem, next, target), colors[6]];
  } else if (tileItem.value == target) {
    return [checkStreakDisplay(prev, tileItem, next, target), colors[5]];
  } else if (tileItem.value >= target - variantRange) {
    return [Number(TileAppearance.DEFAULT), colors[4]];
  } else if (tileItem.value >= target - 2 * variantRange) {
    return [Number(TileAppearance.DEFAULT), colors[3]];
  } else if (tileItem.value >= target - 3 * variantRange) {
    return [Number(TileAppearance.DEFAULT), colors[2]];
  } else if (tileItem.value > 0) {
    return [Number(TileAppearance.DEFAULT), colors[1]];
  } else {
    return [Number(TileAppearance.DEFAULT), colors[0]];
  }
}
function findHeatandStreak(
  inputData: { data: any; target: number },
  prevEnd: any,
  nextStart: any,
  dataType: "date" | "month" | "year"
) {
  let length = inputData.data.length;
  let target = inputData.target;
  if (!target) target = Math.max(...inputData.data.map((x: any) => x.value));
  if (target === 0) target = 1;
  console.log({ target, data: inputData.data });
  const colors = heatMapColorRange(get(userPreferences), "aps1", 6);
  PlainCSSHMColorIndex5.set(colors[5]);
  console.log({ colors });
  if (
    new Date(`prevEnd.${dataType}`) <=
    new Date(`profileStart${dataType}`.toString())
  ) {
    const returnValue: any = findTileColorAndAppearance(
      null,
      inputData.data[0],
      inputData.data[1],
      target,
      colors
    );
    inputData.data[0].display = returnValue[0];
    inputData.data[0].color = returnValue[1];
  } else {
    const returnValue: any = findTileColorAndAppearance(
      prevEnd,
      inputData.data[0],
      inputData.data[1],
      target,
      colors
    );
    inputData.data[0].display = returnValue[0];
    inputData.data[0].color = returnValue[1];
  }
  for (let i = 1; i < length - 1; i++) {
    const returnValue = findTileColorAndAppearance(
      inputData.data[i - 1],
      inputData.data[i],
      inputData.data[i + 1],
      target,
      colors
    );
    inputData.data[i].display = returnValue[0];
    inputData.data[i].color = returnValue[1];
  }
  if (
    new Date(`nextStart.${dataType}`) >=
    new Date(`current${dataType}`.toString())
  ) {
    const returnValue: any = findTileColorAndAppearance(
      inputData.data[length - 2],
      inputData.data[length - 1],
      null,
      target,
      colors
    );
    inputData.data[length - 1].display = returnValue[0];
    inputData.data[length - 1].color = returnValue[1];
  } else {
    const returnValue: any = findTileColorAndAppearance(
      inputData.data[length - 2],
      inputData.data[length - 1],
      nextStart,
      target,
      colors
    );
    inputData.data[length - 1].display = returnValue[0];
    inputData.data[length - 1].color = returnValue[1];
  }
}
function getMonthName(month: number) {
  const monthNames = [
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
  return monthNames[month - 1];
}
function convertToMonthWiseData(dailyData: any) {
  const monthWiseData = {};
  let currentMonth = null;
  let currentMonthData = [];

  for (const data of dailyData) {
    const [year, month] = data.date.split("-");
    const monthKey = getMonthName(Number(month));
    //+ "-" + year;

    if (currentMonth === null) {
      currentMonth = monthKey;
    }

    if (currentMonth !== monthKey) {
      monthWiseData[currentMonth] = currentMonthData;
      currentMonthData = [];
      currentMonth = monthKey;
    }

    currentMonthData.push(data);
  }

  if (currentMonthData.length > 0) {
    monthWiseData[currentMonth] = currentMonthData;
  }

  return monthWiseData;
}
function convertToYearWiseData(monthlyData: MonthlyData[]) {
  const yearWiseData: any = {};

  monthlyData.forEach((data) => {
    const year = data.month.slice(0, 4);
    // const year = new Date(data.month).getFullYear();
    if (!yearWiseData[year]) {
      yearWiseData[year] = [];
    }
    yearWiseData[year].push(data);
  });

  return yearWiseData;
}
function convertToQuadrennialWiseData(yearlyData: YearlyData[]) {
  const qadrennialWiseData: any = {};

  for (let i = 0; i < yearlyData.length; i += 4) {
    const fourYearsData = yearlyData.slice(i, i + 4);
    const startingYear = yearlyData[i].year;
    const key = `QD${startingYear.toString().slice(2)}`;
    qadrennialWiseData[key] = fourYearsData;
  }

  return qadrennialWiseData;
}
function convertToOriginalForm(data: any) {
  const originalData: any[] = [];

  for (const key in data) {
    const individualData = data[key];

    for (const data of individualData) {
      originalData.push(data);
    }
  }
  return originalData;
}
async function fetchDailyDataAndMerge(
  data: DailyData[],
  startDate: Date,
  endDate: Date
) {
  let prevEnd: any = data.splice(0, 1)[0];
  let nextStart: any = data.splice(data.length - 1, 1)[0];
  const df = { dailyData: { data, target: defaultTarget }, prevEnd, nextStart };
  const context = get(calendarHmContext);
  if (!context) return df;
  let apiResponse = await persistance.fetchDailyJournal(
    context,
    startDate,
    endDate
  );
  if (!apiResponse || !isValidArrayWithData(apiResponse.data)) return df;
  const modified = data.map((x) => {
    let apiItem = apiResponse.data.find(
      (item: any) => item.date.split("T")[0] === x.date
    );
    if (apiItem) {
      x.value = apiItem.value / (60 * 60);
    } else {
      x.value = 0;
    }
    return x;
  });
  prevEnd = modified.splice(0, 1)[0];
  nextStart = modified.splice(modified.length - 1, 1)[0];
  return {
    dailyData: { data: modified, target: apiResponse.target },
    prevEnd,
    nextStart
  };
}
async function fetchMonthlyDataAndMerge(
  data: MonthlyData[],
  startYear: number,
  endYear: number
) {
  let prevEnd: any = data.splice(0, 1)[0];
  let nextStart: any = data.splice(data.length - 1, 1)[0];
  const df = {
    monthlyData: { data, target: defaultTarget },
    prevEnd,
    nextStart
  };
  const context = get(calendarHmContext);
  if (!context) return df;
  let apiResponse = await persistance.fetchJournal(
    context,
    "MONTHS",
    startYear,
    endYear
  );
  if (!apiResponse || !isValidArrayWithData(apiResponse.data)) return df;
  console.log({ apiData: apiResponse.data, data });
  const modified = data.map((x) => {
    let apiItem = apiResponse.data.find(
      (item: any) =>
        item.month.split("-")[0] === x.month.split("-")[0] &&
        Number(item.month.split("-")[1]) === Number(x.month.split("-")[1])
    );
    if (apiItem) {
      x.value = apiItem.value / (60 * 60);
    } else {
      x.value = 0;
    }
    return x;
  });
  prevEnd = modified.splice(0, 1)[0];
  nextStart = modified.splice(modified.length - 1, 1)[0];
  return {
    monthlyData: { data: modified, target: apiResponse.target },
    prevEnd,
    nextStart
  };
}
async function fetchYearlyDataAndMerge(
  data: YearlyData[],
  startYear: number,
  endYear: number
) {
  let prevEnd: any = data.splice(0, 1)[0];
  let nextStart: any = data.splice(data.length - 1, 1)[0];
  const df = {
    yearlyData: { data, target: defaultTarget },
    prevEnd,
    nextStart
  };
  const context = get(calendarHmContext);
  if (!context) return df;
  let apiResponse = await persistance.fetchJournal(
    context,
    "YEARS",
    startYear,
    endYear
  );
  if (!apiResponse || !isValidArrayWithData(apiResponse.data)) return df;
  const modified = data.map((x) => {
    let apiItem = apiResponse.data.find((item: any) => item.year === x.year);
    if (apiItem) {
      x.value = apiItem.value / (60 * 60);
    } else {
      x.value = 0;
    }
    return x;
  });
  prevEnd = modified.splice(0, 1)[0];
  nextStart = modified.splice(modified.length - 1, 1)[0];
  return {
    yearlyData: { data: modified, target: apiResponse.target },
    prevEnd,
    nextStart
  };
}
async function fillDateValuesColorandAppearance(
  startDate: Date,
  endDate: Date
) {
  let data = generateDailyDataInRange(startDate, endDate);
  let mergedData = await fetchDailyDataAndMerge(data, startDate, endDate);
  console.log("daily", { result: mergedData });
  findHeatandStreak(
    mergedData.dailyData,
    mergedData.prevEnd,
    mergedData.nextStart,
    "date"
  );
  let monthWiseData = {
    data: convertToMonthWiseData(mergedData.dailyData.data),
    target: mergedData.dailyData.target
  };
  CalendarHeatMapData.set(monthWiseData);
  return true;
}
async function splitDailyDataArrayAndMerge(
  request: "prev" | "next",
  data: DailyData[]
) {
  let dateData: any;
  let date: Date = new Date();
  let result: DailyData[] = [];
  if (request === "prev") {
    const uniqueMonths = new Set(data.map((item) => item.date.slice(0, 7)));
    const firstMonths = Array.from(uniqueMonths).slice(0, 6);
    dateData = data.filter((item) =>
      firstMonths.includes(item.date.slice(0, 7))
    );
    date = new Date(dateData[0]?.date);
    date.setDate(date.getDate() - 1);
    const dates = getprevDateRange(6, date);
    const newDateData = generateDailyDataInRange(
      dates.firstMonthEndDate,
      dates.lastMonthStartDate
    );
    const mergedData = await fetchDailyDataAndMerge(
      newDateData,
      dates.firstMonthEndDate,
      dates.lastMonthStartDate
    );
    findHeatandStreak(
      mergedData.dailyData,
      mergedData.prevEnd,
      mergedData.nextStart,
      "date"
    );
    let monthWiseData = convertToMonthWiseData(mergedData.dailyData.data);
    dateData = convertToMonthWiseData(dateData);
    result = Object.assign(monthWiseData, dateData);
  } else if (request === "next") {
    const uniqueMonths = new Set(data.map((item) => item.date.slice(0, 7)));
    const lastMonths = Array.from(uniqueMonths).slice(-6);
    dateData = data.filter((item) =>
      lastMonths.includes(item.date.slice(0, 7))
    );
    date = new Date(dateData[dateData.length - 1]?.date);
    // date.setDate(date.getDate() - 1);
    const dates = getNextDateRange(6, date);
    const newDateData = generateDailyDataInRange(
      dates.firstMonthEndDate,
      dates.lastMonthStartDate
    );
    const mergedData = await fetchDailyDataAndMerge(
      newDateData,
      dates.firstMonthEndDate,
      dates.lastMonthStartDate
    );
    findHeatandStreak(
      mergedData.dailyData,
      mergedData.prevEnd,
      mergedData.nextStart,
      "date"
    );
    let monthWiseData = convertToMonthWiseData(mergedData.dailyData.data);
    dateData = convertToMonthWiseData(dateData);
    result = Object.assign(dateData, monthWiseData);
  }

  return result;
}
async function splitMonthlyDataArrayAndMerge(
  request: "prev" | "next",
  data: MonthlyData[],
  target: number
) {
  let monthData: any;
  let startYear: number;
  let endYear: number;
  let result: MonthlyData[] = [];

  if (request === "prev") {
    const uniqueYears = new Set(data.map((item) => item.month.slice(0, 4)));
    const firstYears = Array.from(uniqueYears).slice(0, 11);
    startYear = parseInt(firstYears[0]);
    endYear = parseInt(firstYears[firstYears.length - 1]);
    monthData = data.filter((item) => {
      const year = parseInt(item.month.slice(0, 4));
      return year >= startYear && year <= endYear;
    });
    let newMonthData: any = generateMonthlyDataInRange(
      startYear - 11,
      startYear - 1
    );
    let mergedData = await fetchMonthlyDataAndMerge(
      newMonthData,
      startYear,
      endYear
    );
    findHeatandStreak(
      mergedData.monthlyData,
      mergedData.prevEnd,
      mergedData.nextStart,
      "month"
    );
    monthData = convertToYearWiseData(monthData);
    newMonthData = convertToYearWiseData(mergedData.monthlyData.data);
    result = Object.assign(newMonthData, monthData);
  } else if (request === "next") {
    const uniqueYears = new Set(data.map((item) => item.month.slice(0, 4)));
    const lastYears = Array.from(uniqueYears).slice(-11);
    startYear = parseInt(lastYears[0]);
    endYear = parseInt(lastYears[lastYears.length - 1]);
    monthData = data.filter((item) => {
      const year = parseInt(item.month.slice(0, 4));
      return year >= startYear && year <= endYear;
    });
    let newMonthData: any = generateMonthlyDataInRange(
      endYear + 1,
      endYear + 11
    );
    let mergedData = await fetchMonthlyDataAndMerge(
      newMonthData,
      startYear,
      endYear
    );
    findHeatandStreak(
      mergedData.monthlyData,
      mergedData.prevEnd,
      mergedData.nextStart,
      "month"
    );
    monthData = convertToYearWiseData(monthData);
    newMonthData = convertToYearWiseData(mergedData.monthlyData.data);
    result = Object.assign(monthData, newMonthData);
  }

  return result;
}
async function splitYearlyDataArrayAndMerge(
  request: "prev" | "next",
  data: YearlyData[],
  target: number
) {
  let yearData: any;
  let startYear: number;
  let endYear: number;
  let result: YearlyData[] = [];

  if (request === "prev") {
    yearData = data.slice(0, 24); //.map((item) => item.year);
    startYear = yearData[0].year;
    endYear = yearData[yearData.length - 1].year;
    let newYearData: any = generateYearlyDataInRange(
      startYear - 24,
      startYear - 1
    );
    let mergedData = await fetchYearlyDataAndMerge(
      newYearData,
      startYear,
      endYear
    );
    findHeatandStreak(
      mergedData.yearlyData,
      mergedData.prevEnd,
      mergedData.nextStart,
      "year"
    );
    yearData = convertToQuadrennialWiseData(yearData);
    newYearData = convertToQuadrennialWiseData(mergedData.yearlyData.data);
    result = Object.assign(newYearData, yearData);
  } else if (request === "next") {
    yearData = data.slice(24); //.map((item) => item.year);
    startYear = yearData[0].year;
    endYear = yearData[yearData.length - 1].year;
    let newYearData: any = generateYearlyDataInRange(endYear + 1, endYear + 24);
    let mergedData = await fetchYearlyDataAndMerge(
      newYearData,
      startYear,
      endYear
    );
    findHeatandStreak(
      mergedData.yearlyData,
      mergedData.prevEnd,
      mergedData.nextStart,
      "year"
    );
    yearData = convertToQuadrennialWiseData(yearData);
    newYearData = convertToQuadrennialWiseData(mergedData.yearlyData.data);
    result = Object.assign(yearData, newYearData);
  }
  return result;
}
export async function fetchDailyDataForTheYear(year: number) {
  let Dates = getYearRange(year);
  return fillDateValuesColorandAppearance(
    Dates.lastYearEndDate,
    Dates.nextYearStartDate
  );
}
export function fetchLast12MonthsDailyData() {
  let Dates = getprevDateRange();
  return fillDateValuesColorandAppearance(
    Dates.firstMonthEndDate,
    Dates.lastMonthStartDate
  );
}
export async function paginateDailyData(time: "prev" | "next") {
  const data = await splitDailyDataArrayAndMerge(
    time,
    convertToOriginalForm(get(CalendarHeatMapData).data)
  );
  const current = {
    data,
    target: get(CalendarHeatMapData).target
  };
  CalendarHeatMapData.set(current);
}

export async function fetchMonthlyAggData(startYear: number, endYear: number) {
  let monthlyData = generateMonthlyDataInRange(startYear, endYear);
  console.log({ monthlyData });
  let mergedData = await fetchMonthlyDataAndMerge(
    monthlyData,
    startYear,
    endYear
  );
  findHeatandStreak(
    mergedData.monthlyData,
    mergedData.prevEnd,
    mergedData.nextStart,
    "month"
  );
  let yearWiseData = convertToYearWiseData(mergedData.monthlyData.data);
  mergedData.monthlyData.data = yearWiseData;
  CalendarHeatMapData.set(mergedData.monthlyData);
}

export async function paginateMonthlyAggData(time: "prev" | "next") {
  const data = await splitMonthlyDataArrayAndMerge(
    time,
    convertToOriginalForm(get(CalendarHeatMapData).data),
    get(CalendarHeatMapData).target
  );
  const current = {
    data,
    target: get(CalendarHeatMapData).target
  };
  CalendarHeatMapData.set(current);
}

export async function fetchYearlyAggData(startYear: number, endYear: number) {
  let yearlyData = generateYearlyDataInRange(startYear, endYear);
  let mergedData = await fetchYearlyDataAndMerge(
    yearlyData,
    startYear,
    endYear
  );
  findHeatandStreak(
    mergedData.yearlyData,
    mergedData.prevEnd,
    mergedData.nextStart,
    "year"
  );
  let QuadrennialWiseData = convertToQuadrennialWiseData(
    mergedData.yearlyData.data
  );
  mergedData.yearlyData.data = QuadrennialWiseData;
  CalendarHeatMapData.set(mergedData.yearlyData);
}

export async function paginateYearlyAggData(time: "prev" | "next") {
  const data = await splitYearlyDataArrayAndMerge(
    time,
    convertToOriginalForm(get(CalendarHeatMapData).data),
    get(CalendarHeatMapData).target
  );
  const current = {
    data,
    target: get(CalendarHeatMapData).target
  };
  CalendarHeatMapData.set(current);
}
