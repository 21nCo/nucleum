import type {
  DailyData,
  MonthlyData,
  YearlyData
} from "../types/CalendarHeatMapData.type";
import { TileAppearance } from "$lib/tidy/types/CalendarHeatMap.enum";
import {
  CalendarHeatMapData,
  CalendarHeatMapstoreColors
} from "../stores/app.store";
import { get } from "svelte/store";
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
  console.log({ year, lastYearEndDate, nextYearStartDate });
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
      value: getRandomValue() //change to zero by default
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
  target: number
) {
  let baseColor = "#ebebeb";
  let colors = get(CalendarHeatMapstoreColors);
  let noOfColors = colors.length; //exluding the base color
  let variantRange = target / (noOfColors - 2);
  if (tileItem.value > target) {
    return [checkStreakDisplay(prev, tileItem, next, target), colors[5]];
  } else if (tileItem.value == target) {
    return [checkStreakDisplay(prev, tileItem, next, target), colors[4]];
  } else if (tileItem.value >= target - variantRange) {
    return [Number(TileAppearance.DEFAULT), colors[3]];
  } else if (tileItem.value >= target - 2 * variantRange) {
    return [Number(TileAppearance.DEFAULT), colors[2]];
  } else if (tileItem.value >= target - 3 * variantRange) {
    return [Number(TileAppearance.DEFAULT), colors[1]];
  } else if (tileItem.value > 0) {
    return [Number(TileAppearance.DEFAULT), colors[0]];
  } else {
    return [Number(TileAppearance.DEFAULT), baseColor];
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
  if (
    new Date(`prevEnd.${dataType}`) <=
    new Date(`profileStart${dataType}`.toString())
  ) {
    const returnValue: any = findTileColorAndAppearance(
      null,
      inputData.data[0],
      inputData.data[1],
      target
    );
    inputData.data[0].display = returnValue[0];
    inputData.data[0].color = returnValue[1];
  } else {
    const returnValue: any = findTileColorAndAppearance(
      prevEnd,
      inputData.data[0],
      inputData.data[1],
      target
    );
    inputData.data[0].display = returnValue[0];
    inputData.data[0].color = returnValue[1];
  }
  for (let i = 1; i < length - 1; i++) {
    const returnValue = findTileColorAndAppearance(
      inputData.data[i - 1],
      inputData.data[i],
      inputData.data[i + 1],
      target
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
      target
    );
    inputData.data[length - 1].display = returnValue[0];
    inputData.data[length - 1].color = returnValue[1];
  } else {
    const returnValue: any = findTileColorAndAppearance(
      inputData.data[length - 2],
      inputData.data[length - 1],
      nextStart,
      target
    );
    inputData.data[length - 1].display = returnValue[0];
    inputData.data[length - 1].color = returnValue[1];
  }

  // console.log("daily data in findHeatansStreak", inputData);
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
function fillDateValuesColorandAppearance(startDate: Date, endDate: Date) {
  let data = generateDailyDataInRange(startDate, endDate);
  //fetch data from API for the same range and merge with above data in this line
  console.log("generated daily values", { data });
  let prevEnd: any = data.splice(0, 1)[0];
  let nextStart: any = data.splice(data.length - 1, 1)[0];
  let dailyData = {
    data: data,
    target: Math.floor(Math.random() * (10 - 5 + 1)) + 5 //put target fetched from API here
  };
  findHeatandStreak(dailyData, prevEnd, nextStart, "date");
  let monthWiseData = {
    data: convertToMonthWiseData(dailyData.data),
    target: dailyData.target
  };
  console.log({ monthWiseData });
  CalendarHeatMapData.set(monthWiseData);
}
function splitDailyDataArrayAndMerge(
  request: "prev" | "next",
  data: DailyData[],
  target: number
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
    // console.log("dates in prev", dates);
    const newDateData = generateDailyDataInRange(
      dates.firstMonthEndDate,
      dates.lastMonthStartDate
    );
    //fetch data from API for the same range and merge with above data in this line
    let prevEnd: any = newDateData.splice(0, 1)[0];
    console.log("prev end in prev", prevEnd);
    let nextStart: any = newDateData.splice(newDateData.length - 1, 1)[0];
    let dailyData = {
      data: newDateData,
      target: target
    };
    findHeatandStreak(dailyData, prevEnd, nextStart, "date");
    let monthWiseData = convertToMonthWiseData(dailyData.data);
    dateData = convertToMonthWiseData(dateData);
    result = Object.assign(monthWiseData, dateData);
    // console.log("dateData in split and merge", dateData);
  } else if (request === "next") {
    const uniqueMonths = new Set(data.map((item) => item.date.slice(0, 7)));
    const lastMonths = Array.from(uniqueMonths).slice(-6);
    dateData = data.filter((item) =>
      lastMonths.includes(item.date.slice(0, 7))
    );
    // console.log("filtered dateData in next", dateData);
    date = new Date(dateData[dateData.length - 1]?.date);
    // date.setDate(date.getDate() - 1);
    const dates = getNextDateRange(6, date);
    // console.log("dates in next", dates);
    const newDateData = generateDailyDataInRange(
      dates.firstMonthEndDate,
      dates.lastMonthStartDate
    );
    // console.log("new dateData in next", newDateData.length);
    //fetch data from API for the same range and merge with above data in this line
    let prevEnd: any = newDateData.splice(0, 1)[0];
    console.log("prev end in next", prevEnd);
    // console.log("prev end in next", prevEnd);
    let nextStart: any = newDateData.splice(newDateData.length - 1, 1)[0];
    let dailyData = {
      data: newDateData,
      target: target
    };
    findHeatandStreak(dailyData, prevEnd, nextStart, "date");
    let monthWiseData = convertToMonthWiseData(dailyData.data);
    dateData = convertToMonthWiseData(dateData);
    result = Object.assign(dateData, monthWiseData);
    // console.log("dateData in split and merge", dateData);
  }

  return result;
}
function splitMonthlyDataArrayAndMerge(
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
    console.log("split&merger prev startYear", startYear);
    endYear = parseInt(firstYears[firstYears.length - 1]);
    console.log("split&merger prev endYear", endYear);
    monthData = data.filter((item) => {
      const year = parseInt(item.month.slice(0, 4));
      return year >= startYear && year <= endYear;
    });
    let newMonthData: any = generateMonthlyDataInRange(
      startYear - 11,
      startYear - 1
    );
    // fetch data from API for the range one month before and after as done inside generateMonthlyDataInRange and merge with above data newMonthData in this line
    let prevEnd: any = newMonthData.splice(0, 1)[0];
    console.log("prevEnd in prev", prevEnd);
    let nextStart: any = newMonthData.splice(newMonthData.length - 1, 1)[0];
    console.log("nextStart in prev", nextStart);
    let monthlyData = {
      data: newMonthData,
      target: target
    };
    findHeatandStreak(monthlyData, prevEnd, nextStart, "month");
    monthData = convertToYearWiseData(monthData);
    newMonthData = convertToYearWiseData(monthlyData.data);
    result = Object.assign(newMonthData, monthData);
  } else if (request === "next") {
    const uniqueYears = new Set(data.map((item) => item.month.slice(0, 4)));
    const lastYears = Array.from(uniqueYears).slice(-11);
    startYear = parseInt(lastYears[0]);
    console.log("split&merger next startYear", startYear);
    endYear = parseInt(lastYears[lastYears.length - 1]);
    console.log("split&merger next endYear", endYear);
    monthData = data.filter((item) => {
      const year = parseInt(item.month.slice(0, 4));
      return year >= startYear && year <= endYear;
    });
    let newMonthData: any = generateMonthlyDataInRange(
      endYear + 1,
      endYear + 11
    );
    // fetch data from API for the range one month before and after as done inside generateMonthlyDataInRange and merge with above data newMonthData in this line
    let prevEnd: any = newMonthData.splice(0, 1)[0];
    console.log("prevEnd in next", prevEnd);
    let nextStart: any = newMonthData.splice(newMonthData.length - 1, 1)[0];
    console.log("nextStart in next", nextStart);
    let monthlyData = {
      data: newMonthData,
      target: target
    };
    findHeatandStreak(monthlyData, prevEnd, nextStart, "month");
    monthData = convertToYearWiseData(monthData);
    newMonthData = convertToYearWiseData(monthlyData.data);
    result = Object.assign(monthData, newMonthData);
  }

  return result;
}
function splitYearlyDataArrayAndMerge(
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
    console.log("split&merger prev startYear", startYear);
    endYear = yearData[yearData.length - 1].year;
    console.log("split&merger prev endYear", endYear);
    let newYearData: any = generateYearlyDataInRange(
      startYear - 24,
      startYear - 1
    );
    // fetch data from API for the range one year before and after as done inside generateYearlyDataInRange and merge with above data newMonthData in this line
    let prevEnd: any = newYearData.splice(0, 1)[0];
    console.log("prevEnd in prev", prevEnd);
    let nextStart: any = newYearData.splice(newYearData.length - 1, 1)[0];
    console.log("nextStart in prev", nextStart);
    let yearlyData = {
      data: newYearData,
      target: target
    };
    findHeatandStreak(yearlyData, prevEnd, nextStart, "year");
    yearData = convertToQuadrennialWiseData(yearData);
    newYearData = convertToQuadrennialWiseData(yearlyData.data);
    result = Object.assign(newYearData, yearData);
  } else if (request === "next") {
    yearData = data.slice(24); //.map((item) => item.year);
    startYear = yearData[0].year;
    console.log("split&merger next startYear", startYear);
    endYear = yearData[yearData.length - 1].year;
    console.log("split&merger next endYear", endYear);
    let newYearData: any = generateYearlyDataInRange(endYear + 1, endYear + 24);
    // fetch data from API for the range one year before and after as done inside generateYearlyDataInRange and merge with above data newMonthData in this line
    let prevEnd: any = newYearData.splice(0, 1)[0];
    console.log("prevEnd in next", prevEnd);
    let nextStart: any = newYearData.splice(newYearData.length - 1, 1)[0];
    console.log("nextStart in next", nextStart);
    let yearlyData = {
      data: newYearData,
      target: target
    };
    findHeatandStreak(yearlyData, prevEnd, nextStart, "year");
    yearData = convertToQuadrennialWiseData(yearData);
    newYearData = convertToQuadrennialWiseData(yearlyData.data);
    result = Object.assign(yearData, newYearData);
  }

  return result;
}
export function fetchDailyDataForTheYear(year: number) {
  let Dates = getYearRange(year);
  fillDateValuesColorandAppearance(
    Dates.lastYearEndDate,
    Dates.nextYearStartDate
  );
}
export function fetchLast365daysData() {
  //interpreting last 365 days as last 12 months
  let Dates = getprevDateRange();
  fillDateValuesColorandAppearance(
    Dates.firstMonthEndDate,
    Dates.lastMonthStartDate
  );
}
export function fetch6months(time: "prev" | "next") {
  const current = {
    data: splitDailyDataArrayAndMerge(
      time,
      convertToOriginalForm(get(CalendarHeatMapData).data),
      get(CalendarHeatMapData).target
    ),
    target: get(CalendarHeatMapData).target
  };
  CalendarHeatMapData.set(current);
}

export function fetch22years(startYear: number, endYear: number) {
  let monthlyData = generateMonthlyDataInRange(startYear, endYear);
  //fill data from API for the range one Monthly before and after as done inside generateMonthlylyDataInRange and merge with above data in this line
  let prevEnd: any = monthlyData.splice(0, 1)[0];
  let nextStart: any = monthlyData.splice(monthlyData.length - 1, 1)[0];
  let monthlyDataObj = {
    data: monthlyData,
    target: 100
  };
  findHeatandStreak(monthlyDataObj, prevEnd, nextStart, "month");
  let yearWiseData = convertToYearWiseData(monthlyDataObj.data);
  monthlyDataObj.data = yearWiseData;
  CalendarHeatMapData.set(monthlyDataObj);
}

export function fetch11years(time: "prev" | "next") {
  const current = {
    data: splitMonthlyDataArrayAndMerge(
      time,
      convertToOriginalForm(get(CalendarHeatMapData).data),
      get(CalendarHeatMapData).target
    ),
    target: get(CalendarHeatMapData).target
  };
  CalendarHeatMapData.set(current);
}

export function fetch48Years(startYear: number, endYear: number) {
  let YearlyData = generateYearlyDataInRange(startYear, endYear);
  //fill data from API for the range one year before and after as done inside generateYearlyDataInRange and merge with above data in this line
  let prevEnd: any = YearlyData.splice(0, 1)[0];
  let nextStart: any = YearlyData.splice(YearlyData.length - 1, 1)[0];
  let YearlyDataObj = {
    data: YearlyData,
    target: 3000 //put target fetched from API here
  };
  findHeatandStreak(YearlyDataObj, prevEnd, nextStart, "year");
  let QuadrennialWiseData = convertToQuadrennialWiseData(YearlyDataObj.data);
  YearlyDataObj.data = QuadrennialWiseData;
  CalendarHeatMapData.set(YearlyDataObj);
}

export function fetch24years(time: "prev" | "next") {
  const current = {
    data: splitYearlyDataArrayAndMerge(
      time,
      convertToOriginalForm(get(CalendarHeatMapData).data),
      get(CalendarHeatMapData).target
    ),
    target: get(CalendarHeatMapData).target
  };
  CalendarHeatMapData.set(current);
}
