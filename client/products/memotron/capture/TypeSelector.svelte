<script lang="ts">
  import { CaptureMethod } from "$lib/client/products/memotron/capture/capture.type";
  import { MemotronAction } from "$lib/client/products/memotron/memotronAction.enum";
  import Button from "$lib/client/elements/button/Button.svelte";
  import type { ISelectItem } from "$lib/client/types/select.type";
  import { Size } from "$lib/client/types/size.enum";
  import { appStore } from "$lib/client/stores/app.store";
  import { collectionStore } from "$lib/client/components/collection/collection.store";

  import TypeSelectorItem from "./typeSelector/TypeSelectorItem.svelte";
  import Text from "$lib/client/elements/text/Text.svelte";
  import { TextStyle } from "$lib/client/types/text.enum";
  import { ButtonStyle } from "$lib/client/types/button.type";
  export let selected: string;
  export let isHideTypeShortcuts: boolean = false;
  let dev_isEnableEditShortcuts: boolean = true;

  const contentTypes: (ISelectItem & { value: string })[] = [
    {
      value: CaptureMethod.MARKDOWN,
      icon: "markdown"
    },
    {
      icon: "microphone",
      value: CaptureMethod.AUDIO
    },
    {
      icon: "camera",
      value: CaptureMethod.CAMERA
    },
    {
      icon: "upload",
      value: CaptureMethod.UPLOAD
    }
  ];

  async function refreshTypes() {
    if (isHideTypeShortcuts) return [];
    const types = await collectionStore.resolveCaptureShortcuts();
    return [...contentTypes, ...(isHideTypeShortcuts ? [] : types)];
  }
</script>

<div class="w-full flex flex-col items-center gap-3 dp:gap-4">
  <div class="self-start">
    <Text content="Select a type" style={TextStyle.SECTION_HEADING} />
  </div>
  {#await refreshTypes()}
    <!--  -->
  {:then result}
    <div
      class="grid mo:grid-cols-[repeat(auto-fill,minmax(8rem,1fr))] grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] gap-2 dp:gap-4 w-full"
    >
      {#each result as item}
        <TypeSelectorItem
          {item}
          isActive={selected === item.value}
          on:select
          on:capture
        />
      {/each}
    </div>
  {/await}

  {#if dev_isEnableEditShortcuts}
    <Button
      label="Edit shortcuts"
      style={ButtonStyle.PLAIN}
      isUnderlined={true}
      size={Size.sm}
      on:click={() => {
        appStore.runAction(MemotronAction.CAPTURE_SETTINGS);
      }}
    />
  {/if}
</div>
