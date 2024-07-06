<script lang="ts">
  import { cn } from "$lib/client/utils/ui.utils";
  import {
    getDaysInMonth,
    getFirstAlphabetPosition,
    monthNames
  } from "./Birdview.utils";
  const monthNamesFull = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December"
  ];
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  export let date: string;
  const firstAlphPos = getFirstAlphabetPosition(date);
  let year = Number(date.slice(0, firstAlphPos));
  let month = date.slice(-3);
  let monthIndex = monthNames.indexOf(month);
  let monthFull = monthNamesFull[monthIndex];
  let monthEndDate = getDaysInMonth(monthIndex, year);
  let data = Array.from({ length: monthEndDate }, (_, i) => i + 1);
  let startDay = new Date(Date.UTC(year, monthIndex, 1)).getDay() + 1;
</script>

<div
  data-date={`${year}-${monthIndex < 9 ? "0" : ""}${monthIndex + 1}`}
  class="text-fgs2 bg-bgs2 h-full w-[35%] flex-none border-r border-brs3"
>
  <div
    class="border-y h-12 border-brs3 flex flex-col justify-center items-center p-2"
  >
    <p class={cn("text-b3 text-fgs3", { hidden: month != "Jan" })}>
      {year}
    </p>
    <p class="font-medium text-h5">{monthFull}</p>
  </div>
  <div class="grid grid-cols-7 gap-1 p-2 text-b2">
    {#each dayNames as dayName}
      <p class="w-8 text-center text-b3 text-fgs3">{dayName}</p>
    {/each}
    {#each data as day, index (index)}
      {#if index == 0}
        <p class={"w-8 text-center"} style="grid-column-start: {startDay};">
          {day}
        </p>
      {:else}
        <p class="w-8 text-center">{day}</p>
      {/if}
    {/each}
  </div>
</div>
