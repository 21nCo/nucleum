<script lang="ts">
  import { CaptureType } from "$lib/tidy/types/memotron/capture.type";
  import { MemotronEvent } from "$lib/local/types/event.enum";
  import Button from "$lib/tidy/elements/button/Button.svelte";
  import OptionSelector from "$lib/tidy/elements/select/OptionSelector.svelte";
  import { dataManager } from "$lib/tidy/stores/data.store";
  import type { SelectItem } from "$lib/tidy/types/select.type";
  import { Size } from "$lib/tidy/types/size.enum";
  import { activeResourceFilter, runAction } from "$lib/tidy/utils/utils";
  import { captureStore } from "./capture.store";
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
      runAction(MemotronEvent.DIRECTORY);
    }}
  />
</div>
