<script lang="ts">
  import { dayNames, monthNames } from "@21n/components/calendar/birdView/Birdview.utils";

  export let date: string;
  let dayMonth = date.split("-")[1];
  let dayDate = date.split("-")[2];
  if (date.split("-")[2] == "01") {
    dayDate = monthNames[Number(dayMonth) - 1] + " - " + dayDate;
  }
  let day = new Date(date).getDay();
</script>

<div
  data-date={date}
  class="flex-none text-fgs1 box-content font-medium text-h5 w-80 bg-bgs2 border-r border-brs3 break-words"
>
  <div class="p-2 h--12 w-full text-center border-y border-brs3">
    <p class="text-b3 text-fgs3">
      {dayNames[day]}
    </p>
    <p class="font-medium">{dayDate}</p>
  </div>
</div>
