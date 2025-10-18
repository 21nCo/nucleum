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
  import Icon from "$lib/client/elements/Icon.svelte";
  import ComponentBaseLayer from "$lib/client/layout/layers/ComponentBaseLayer.svelte";
  import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
  import { CollectionObjectKey } from "$lib/client/components/collection/collection.type";
  import context from "$lib/client/stores/context.store";
  export let selected: string;
  export let isHideTypeShortcuts: boolean = false;
  let dev_isEnableEditShortcuts: boolean = true;
  let refreshId: number = new Date().getTime();

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
    },
    ...(!$context.isEmbed
      ? [
          {
            icon: "clipboard",
            value: CaptureMethod.PASTE
          }
        ]
      : [])
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
  {#key refreshId}
    {#await refreshTypes()}
      <div
        class="flex justify-center bg-bgs1"
        role="status"
        aria-label="Loading"
      >
        <Icon icon="svg-spinners:3-dots-fade" />
      </div>
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
  {/key}
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

<ComponentBaseLayer
  subscribeToResource={new Set([Resource.collection])}
  subscriptionPropsForMergeAction={[
    CollectionObjectKey.isCaptureShortcutEnabled
  ]}
  on:change={() => {
    refreshId = new Date().getTime();
  }}
/>
