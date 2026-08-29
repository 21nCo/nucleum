<script lang="ts">
  import Button from "@21n/elements/button/Button.svelte";
  import {
    nucleumDatafnStatus,
    pullDatafnNow,
    reconcileDatafnNow
  } from "@21n/stores/datafn.store";
  import { stringify } from "@21n/shared-utils/json.utils";

  let isBusy = false;

  async function run(action: "pull" | "reconcile") {
    isBusy = true;
    try {
      if (action === "pull") await pullDatafnNow();
      else await reconcileDatafnNow();
    } finally {
      isBusy = false;
    }
  }
</script>

<div class="w-full h-full flex flex-col gap-4 p-4 overflow-auto">
  <div class="flex items-center justify-between gap-3">
    <div>
      <div class="text-h4 font-medium">DataFn sync</div>
      <div class="text-b3 text-fgs2">{$nucleumDatafnStatus.status}</div>
    </div>
    <div class="flex gap-2">
      <Button label={isBusy ? "Running" : "Pull"} onclick={() => run("pull")} />
      <Button label="Reconcile" onclick={() => run("reconcile")} />
    </div>
  </div>
  <pre
    class="text-b3 bg-bgs2 border border-brs3 rounded-md p-3 overflow-auto">{stringify(
      $nucleumDatafnStatus,
      { space: 2 }
    )}</pre>
</div>
