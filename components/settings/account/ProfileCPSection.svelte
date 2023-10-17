<script>
  import { userPreferences, windowObject } from "$lib/tidy/stores/app.store";
  import { bg } from "$lib/tidy/utils/utils";
</script>

<div class="rounded-lg mx-4 {bg($userPreferences.theme, 1)}">
  <div class="flex flex-col justify-center h-40 text-fgs3 items-center">
    Profile section
    <button
      class="text-accent1"
      on:click={() => windowObject.gotoPath("/cp/account")}
    >
      go to account</button
    >
  </div>
</div>
