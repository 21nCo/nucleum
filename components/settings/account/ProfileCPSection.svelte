<script>
  import { windowObject } from "$lib/tidy/stores/app.store";
</script>

<div class="bg-bgs2 rounded-lg mx-4">
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
