<script lang="ts">
  import Button from "$lib/client/elements/button/Button.svelte";
  import { PointronAction } from "$lib/client/types/pointron/pointronAction.enum";
  import { appStore } from "$lib/client/stores/app.store";
  import { ImportSource } from "./data.type";
  export let isIncludeSelf: boolean = true;
  const importSources = [
    {
      label: "Atracker",
      id: ImportSource.ATRACKER
    },
    {
      label: "Session",
      id: ImportSource.SESSION
    },
    {
      label: "Toggl track",
      id: ImportSource.TOGGL_TRACK
    },
    {
      label: "Timemator",
      id: ImportSource.TIMEMATOR
    }
  ];
  if (isIncludeSelf)
    importSources.push({ label: "Pointron", id: ImportSource.SELF });
  function onImportButtonClick(id: string) {
    appStore.runAction(PointronAction.IMPORT_APP_DATA, {
      componentParams: { importSource: id }
    });
  }
</script>

<div class="flex flex-col gap-3">
  <div class="text-left mo:text-b2 text-fgs2">
    Pick an app to import your time tracking data
  </div>
  <div
    class="protrait:grid portrait:grid-cols-2 portrait:gap-3 flex gap-4 flex-wrap"
  >
    {#each importSources as { label, id }}
      <Button on:click={() => onImportButtonClick(id)} {label} />
    {/each}
  </div>
</div>
