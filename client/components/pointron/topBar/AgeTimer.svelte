<script lang="ts">
  import { onMount, tick } from "svelte";
  import { userPreferences } from "$lib/client/stores/app.store";
  let ageInYears: number | undefined = undefined;
  onMount(() => {
    if (!$userPreferences.birthday) return;
    let today = new Date();
    let ageInMilliseconds =
      today.getTime() - new Date($userPreferences.birthday).getTime();
    let ageInSeconds = ageInMilliseconds / 1000;
    ageInYears = ageInSeconds / (60 * 60 * 24 * 365);

    setInterval(() => {
      tick();
      today = new Date();
      ageInMilliseconds =
        today.getTime() - new Date($userPreferences.birthday!).getTime();
      ageInSeconds = ageInMilliseconds / 1000;
      ageInYears = ageInSeconds / (60 * 60 * 24 * 365);
    }, 100);
  });
</script>

<div class="text-b3">{ageInYears ? ageInYears.toFixed(10) : ""}</div>
