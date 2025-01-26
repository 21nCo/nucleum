<script lang="ts">
  import { Size } from "$lib/client/types/size.enum";
  import { cn } from "$lib/client/utils/ui.utils";

  export let selectedDate: Date;
  export let events: any[] = [];

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const hours = Array.from({ length: 24 }, (_, i) => i);

  function getWeekDates(date: Date) {
    const week = [];
    const current = new Date(date);
    current.setDate(current.getDate() - current.getDay()); // Start from Sunday

    for (let i = 0; i < 7; i++) {
      week.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    return week;
  }

  $: weekDates = getWeekDates(selectedDate);
  $: isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };
</script>

<div class="grid grid-cols-[auto_1fr] h-full">
  <!-- Time labels -->
  <div class="border-r border-brs3">
    <div class="h-12 border-b border-brs3" />
    <!-- Empty corner -->
    {#each hours as hour}
      <div
        class="h-12 px-2 border-b border-brs3 text-fgs3 text-sm flex items-center justify-end"
      >
        {hour === 0 ? "12" : hour > 12 ? hour - 12 : hour}
        {hour >= 12 ? "PM" : "AM"}
      </div>
    {/each}
  </div>

  <!-- Week grid -->
  <div class="overflow-auto">
    <!-- Day headers -->
    <div
      class="grid grid-cols-7 h-12 border-b border-brs3 sticky top-0 bg-bgs1"
    >
      {#each weekDates as date, i}
        <div
          class="flex flex-col items-center justify-center border-l border-brs3 first:border-l-0"
        >
          <div class="text-sm text-fgs2">{weekDays[i]}</div>
          <div class={cn("text-sm font-medium", isToday(date) && "text-aps1")}>
            {date.getDate()}
          </div>
        </div>
      {/each}
    </div>

    <!-- Time slots -->
    <div class="grid grid-cols-7">
      {#each weekDates as date}
        <div class="border-l border-brs3 first:border-l-0">
          {#each hours as hour}
            <div class="h-12 border-b border-brs3" />
          {/each}
        </div>
      {/each}
    </div>
  </div>
</div>
