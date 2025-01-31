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
  import { CollectionType } from "$lib/client/components/collection/collection.type";
  import { createEventDispatcher } from "svelte";
  const dispatch = createEventDispatcher();
  import TypeSelectorItem from "./typeSelector/TypeSelectorItem.svelte";
  import Text from "$lib/client/elements/text/Text.svelte";
  import { TextStyle } from "$lib/client/types/text.enum";
  import { uiState } from "$lib/client/stores/uiState/uiState.store";
  import { UIState } from "$lib/client/stores/uiState/uiState.type";

  export let isCapturePage: boolean = false;
  export let selected: string;
  let dev_isEnableEditShortcuts: boolean = false;
  refreshTypes();
  const contentTypes: (ISelectItem & { value: string })[] = [
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

  let types: (ISelectItem & { value: string; isShortcut?: boolean })[] = [];

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
        const recents = uiState.getState(UIState.captureShortcutRecents);
        types = data.map((type: any) => ({
          value: type.id,
          label: type.label,
          icon: type.avatar,
          isShortcut: true
        }));
        types.sort((a, b) => {
          const aIndex = recents.indexOf(a.value.toString());
          const bIndex = recents.indexOf(b.value.toString());
          if (aIndex !== -1 && bIndex !== -1) {
            return aIndex - bIndex;
          }
          if (aIndex !== -1) {
            return -1;
          }
          if (bIndex !== -1) {
            return 1;
          }
          return 0;
        });
      });
  }

  function onselect(val: string) {
    selected = val;
    const valString = val.toString();
    let recents = uiState.getState(UIState.captureShortcutRecents);
    if (recents && recents.includes(valString)) {
      recents = recents.filter((x: string) => x !== valString);
      recents.unshift(valString);
    } else if (recents) {
      recents.unshift(valString);
    } else {
      recents = [valString];
    }
    uiState.setState(UIState.captureShortcutRecents, recents);
    dispatch("select", val);
  }
</script>

<div class="h-full w-full flex flex-col items-center gap-3 dp:gap-4">
  <div class="self-start">
    <Text content="Select a type" style={TextStyle.SECTION_HEADING} />
  </div>
  {#key types}
    <div
      class="grid mo:grid-cols-[repeat(auto-fill,minmax(8rem,1fr))] grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] gap-2 dp:gap-4 w-full"
    >
      {#each [...contentTypes, ...types] as item}
        <TypeSelectorItem
          {item}
          isActive={selected === item.value}
          on:click={() => onselect(item.value)}
          on:capture
        />
      {/each}
    </div>
  {/key}
  {#if isCapturePage && dev_isEnableEditShortcuts}
    <Button
      label="edit"
      isPreventMinWidth={true}
      icon="ph:pencil-simple-line-light"
      size={Size.sm}
      on:click={() => {
        appStore.runAction(MemotronAction.LIBRARY);
      }}
    />
  {/if}
</div>
