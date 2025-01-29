<script lang="ts">
  import Birdview from "../birdView/Birdview.svelte";
  import CalendarLayout from "../CalendarLayout.svelte";

  export let panel: string = "bird";
</script>

<CalendarLayout bind:panel>
  <div class="w-full h-full max-h-full">
    <Birdview />
  </div>
</CalendarLayout>
