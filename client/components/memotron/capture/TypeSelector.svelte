<script lang="ts">
  import { CaptureType } from "$lib/client/types/memotron/capture.type";
  import { MemotronEvent } from "$lib/client/types/memotron/memotronEvent.enum";
  import Button from "$lib/client/elements/button/Button.svelte";
  import OptionSelector from "$lib/client/elements/select/OptionSelector.svelte";
  import { dataManager } from "$lib/client/stores/data.store";
  import type { SelectItem } from "$lib/client/types/select.type";
  import { Size } from "$lib/client/types/size.enum";
  import { activeResourceFilter } from "$lib/client/utils/utils";
  import { captureStore } from "./capture.store";
  import { appStore } from "$lib/client/stores/app.store";
  refreshTypes();
  const contentTypes: SelectItem[] = [
    // { label: CaptureType.ANY, icon: "cube" },
    { label: CaptureType.MARKDOWN, value: CaptureType.MARKDOWN },
    { label: CaptureType.AUDIO, icon: "microphone", value: CaptureType.AUDIO },
    { label: CaptureType.CAMERA, icon: "camera", value: CaptureType.CAMERA },
    { label: CaptureType.UPLOAD, icon: "upload", value: CaptureType.UPLOAD }
  ];
  let types: SelectItem[] = [];

  function refreshTypes() {
    $dataManager.cacheSource.dexie.type
      .filter(activeResourceFilter)
      .toArray()
      .then((data) => {
        types = data.map((type) => ({
          value: type.id,
          label: type.label,
          icon: type.avatar
        }));
      });
  }
</script>

<div class="h-full w-full flex flex-col items-center gap-4">
  {#key types}
    <OptionSelector
      label="Select a type"
      bind:selected={$captureStore.captureType}
      options={[...contentTypes, ...types]}
      on:select
    />
  {/key}
  <Button
    label="edit types"
    size={Size.xs}
    on:click={() => {
      appStore.runAction(MemotronEvent.DIRECTORY);
    }}
  />
</div>
