<script lang="ts">
  import { CaptureType } from "$lib/client/products/memotron/capture/capture.type";
  import { MemotronAction } from "$lib/client/products/memotron/memotronAction.enum";
  import Button from "$lib/client/elements/button/Button.svelte";
  import type { ISelectItem } from "$lib/client/types/select.type";
  import { Size } from "$lib/client/types/size.enum";
  import { activeResourceFilterV2 } from "$lib/client/utils/utils";
  import { appStore } from "$lib/client/stores/app.store";
  import { flux } from "$lib/client/components/flux/flux";
  import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
  import { CollectionType } from "../collection/collection.type";
  import { createEventDispatcher } from "svelte";
  const dispatch = createEventDispatcher();
  import TypeSelectorItem from "./typeSelector/TypeSelectorItem.svelte";
  import Text from "$lib/client/elements/text/Text.svelte";
  import { TextStyle } from "$lib/client/types/text.enum";
  export let isCapturePage: boolean = false;
  export let selected: string;
  let dev_isEnableEditShortcuts: boolean = false;
  refreshTypes();
  const contentTypes: ISelectItem[] = [
    {
      value: CaptureType.MARKDOWN,
      icon: "ph:markdown-logo-light"
    },
    {
      icon: "ph:microphone-light",
      value: CaptureType.AUDIO
    },
    {
      icon: "ph:camera-light",
      value: CaptureType.CAMERA
    },
    {
      icon: "ph:upload-light",
      value: CaptureType.UPLOAD
    }
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

<div class="h-full w-full flex flex-col items-center gap-3 dp:gap-4">
  <div class="self-start">
    <Text content="Select a type" style={TextStyle.SECTION_HEADING} />
  </div>
  {#key types}
    <div
      class="grid mo:grid-cols-[repeat(auto-fill,minmax(8rem,1fr))] grid-cols-[repeat(auto-fill,minmax(10rem,1fr))] gap-4 w-full"
    >
      {#each [...contentTypes, ...types] as item}
        <TypeSelectorItem
          {item}
          isActive={selected === item.value}
          on:click={() => {
            selected = item.value;
            dispatch("select", item.value);
          }}
          on:capture
        />
      {/each}
    </div>
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
