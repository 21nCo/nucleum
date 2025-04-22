<script lang="ts">
  import DayTimeline from "./DayTimeline.svelte";
  import { onMount } from "svelte";
  import dayjs from "dayjs";

  let date = new Date();

  // Generate sample events for the timeline
  const generateSampleEvents = () => {
    const today = dayjs().startOf("day");
    const sampleEvents = [
      {
        startUnix: today.add(8, "hour").valueOf(),
        endUnix: today.add(9, "hour").valueOf(),
        label: "Morning meeting"
      },
      {
        startUnix: today.add(12, "hour").valueOf(),
        endUnix: today.add(13, "hour").valueOf(),
        label: "Lunch break"
      },
      {
        startUnix: today.add(14, "hour").valueOf(),
        endUnix: today.add(16, "hour").valueOf(),
        label: "Project planning"
      },
      {
        startUnix: today.add(17, "hour").valueOf(),
        endUnix: today.add(18, "hour").add(30, "minute").valueOf(),
        label: "Gym workout"
      },
      {
        startUnix: today.add(20, "hour").valueOf(),
        endUnix: today.add(21, "hour").valueOf(),
        label: "Dinner"
      }
    ];

    return sampleEvents;
  };

  let timelineData = generateSampleEvents();

  // For demo purposes, let's add functionality to switch between today and tomorrow
  function setToday() {
    date = new Date();
    timelineData = generateSampleEvents();
  }

  function setTomorrow() {
    date = dayjs().add(1, "day").toDate();
    const tomorrow = dayjs().add(1, "day").startOf("day");

    timelineData = [
      {
        startUnix: tomorrow.add(9, "hour").valueOf(),
        endUnix: tomorrow.add(10, "hour").valueOf(),
        label: "Team standup"
      },
      {
        startUnix: tomorrow.add(11, "hour").valueOf(),
        endUnix: tomorrow.add(12, "hour").valueOf(),
        label: "Client call"
      },
      {
        startUnix: tomorrow.add(13, "hour").valueOf(),
        endUnix: tomorrow.add(15, "hour").valueOf(),
        label: "Design review"
      }
    ];
  }
</script>

<div class="p-4 w-full h-screen flex flex-col bg-bgs1">
  <div class="mb-4 flex justify-between items-center">
    <h2 class="text-fgs1 text-h4">Day timeline test</h2>
    <div class="flex space-x-2">
      <button
        class="px-3 py-1 bg-bgs2 text-fgs1 rounded-md hover:bg-bgs3"
        on:click={setToday}
      >
        Today
      </button>
      <button
        class="px-3 py-1 bg-bgs2 text-fgs1 rounded-md hover:bg-bgs3"
        on:click={setTomorrow}
      >
        Tomorrow
      </button>
    </div>
  </div>

  <div class="flex-1 border border-bgs3 rounded-md overflow-hidden">
    <DayTimeline {date} data={timelineData} />
  </div>
</div>
