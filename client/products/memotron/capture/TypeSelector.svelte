<script lang="ts">
  import { CaptureType } from "$lib/client/products/memotron/capture/capture.type";
  import { MemotronAction } from "$lib/client/products/memotron/memotronAction.enum";
  import Button from "$lib/client/elements/button/Button.svelte";
  import OptionSelector from "$lib/client/elements/select/OptionSelector.svelte";
  import type { ISelectItem } from "$lib/client/types/select.type";
  import { Size } from "$lib/client/types/size.enum";
  import { activeResourceFilterV2 } from "$lib/client/utils/utils";
  import { appStore } from "$lib/client/stores/app.store";
  import type { InputLabel } from "$lib/client/types/input.type";
  import { Orientation } from "$lib/client/types/direction.enum";
  import { flux } from "$lib/client/components/flux/flux";
  import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
  import { CollectionType } from "../collection/collection.type";
  import view from "$lib/client/stores/view.store";
  import { Display } from "$lib/client/types/view.type";
  export let isCapturePage: boolean = false;
  export let label: InputLabel = { label: "Select Type" };
  export let selected: string;
  let dev_isEnableEditShortcuts: boolean = false;
  refreshTypes();
  const contentTypes: ISelectItem[] = [
    // { label: CaptureType.ANY, icon: "cube" },
    {
      label: CaptureType.MARKDOWN,
      value: CaptureType.MARKDOWN,
      // icon: "bi:markdown-fill"
      icon: "ph:markdown-logo-light"
      // icon: "hugeicons:text-font"
    },
    {
      label: CaptureType.AUDIO,
      icon: "ph:microphone-light",
      // icon: "heroicons:microphone",
      // icon: "lucide:mic",
      value: CaptureType.AUDIO
    },
    {
      label: CaptureType.CAMERA,
      // icon: "lucide:camera",
      icon: "ph:camera-light",
      value: CaptureType.CAMERA
    },
    {
      label: CaptureType.CAMERA_V2,
      // icon: "lucide:camera",
      icon: "ph:camera-light",
      value: CaptureType.CAMERA_V2
    },
    {
      label: CaptureType.UPLOAD,
      // icon: "lucide:upload",
      icon: "ph:upload-light",
      value: CaptureType.UPLOAD
    }
  ];
  const collectionTypes: ISelectItem[] = [
    { label: "Add new", icon: "plus", value: "add" },
    { label: "None", icon: "cube-transparent", value: "none" }
  ];
  let types: ISelectItem[] = [];

  function refreshTypes() {
    flux
      .selectMany(Resource.collection, {
        filters: {
          type: CollectionType.TYPED,
          isCaptureShortcutEnabled: true,
          ...activeResourceFilterV2
        }
      })
      .then((data) => {
        types = data.map((type) => ({
          value: type.id,
          label: type.label,
          icon: type.avatar
        }));
      });
  }
</script>

<div class="h-full w-full flex flex-col items-center gap-4 dp:gap-6 2k:gap-8">
  {#key types}
    <OptionSelector
      labelProps={{ ...label, orientation: Orientation.Vertical }}
      bind:selected
      size={$view.display === Display.TK ? Size.lg : Size.md}
      options={isCapturePage
        ? [...contentTypes, ...types]
        : [...collectionTypes, ...types]}
      on:select
    />
  {/key}
  {#if isCapturePage && dev_isEnableEditShortcuts}
    <Button
      label="edit"
      isPreventMinWidth={true}
      icon="ph:pencil-simple-line-thin"
      size={Size.sm}
      on:click={() => {
        appStore.runAction(MemotronAction.LIBRARY);
      }}
    />
  {/if}
</div>
