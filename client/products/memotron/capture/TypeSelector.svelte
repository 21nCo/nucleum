<script lang="ts">
  import { CaptureMethod } from "@21n/products/memotron/capture/capture.type";
  import { MemotronAction } from "@21n/products/memotron/memotronAction.enum";
  import Button from "@21n/elements/button/Button.svelte";
  import type { ISelectItem } from "@21n/types/select.type";
  import { Size } from "@21n/types/size.enum";
  import { appStore } from "@21n/stores/app.store";
  import { collectionStore } from "@21n/components/collection/collection.store";

  import TypeSelectorItem from "@21n/products/memotron/capture/typeSelector/TypeSelectorItem.svelte";
  import Text from "@21n/elements/text/Text.svelte";
  import { TextStyle } from "@21n/types/text.enum";
  import { ButtonStyle } from "@21n/types/button.type";
  import Icon from "@21n/elements/Icon.svelte";
  import ComponentBaseLayer from "@21n/layout/layers/ComponentBaseLayer.svelte";
  import { Resource } from "@21n/components/flux/resourceStores/resource.enum";
  import { CollectionObjectKey } from "@21n/components/collection/collection.type";
  import context from "@21n/stores/context.store";
  import { cn } from "@21n/utils/ui.utils";
  export let selected: string;
  export let isHideTypeShortcuts: boolean = false;
  let dev_isEnableEditShortcuts: boolean = true;
  let refreshId: number = new Date().getTime();
  const isDev = import.meta.env.DEV;
  const dev_isBoxed: boolean = true;

  const contentTypes: (ISelectItem & { value: string })[] = [
    {
      value: CaptureMethod.MARKDOWN,
      label: "Page",
      icon: "markdown"
    },
    {
      value: CaptureMethod.MARKDOWN,
      label: "Note",
      icon: "note-blank"
    },
    {
      icon: "microphone",
      value: CaptureMethod.AUDIO
    },
    {
      icon: "camera",
      value: CaptureMethod.CAMERA
    },
    ...(isDev
      ? [
          {
            icon: "ri:sketching",
            value: CaptureMethod.SKETCH
          },
          {
            icon: "globe",
            value: CaptureMethod.WEB,
            label: "Add from Web"
          }
        ]
      : []),
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
  {#if !dev_isBoxed}
    <div class="self-start">
      <Text content="Select a type" style={TextStyle.SECTION_HEADING} />
    </div>
  {/if}
  {#key refreshId}
    {#await refreshTypes()}
      <div
        class="flex justify-center bg-bgs1"
        role="status"
        aria-label="Loading"
      >
        <Icon icon="svg-spinners:3-dots-fade" />
      </div>
    {:then types}
      <div
        class={cn(
          "grid mo:grid-cols-[repeat(auto-fill,minmax(8rem,1fr))] w-full",
          {
            "gap-2 dp:gap-4 grid-cols-[repeat(auto-fill,minmax(12rem,1fr))]":
              !dev_isBoxed,
            "gap-0.5 bg-bgs2 rounded-md border-2 border-bgs2 overflow-hidden grid-cols-4":
              dev_isBoxed
          }
        )}
      >
        {#each types as item, index}
          <div
            class={cn({
              "col-span-3": types.length % 4 === 1 && index === types.length - 1
            })}
          >
            <TypeSelectorItem
              {item}
              isActive={selected === item.value}
              isBoxed={true}
              on:select
              on:capture
            />
          </div>
        {/each}
        {#if dev_isEnableEditShortcuts && dev_isBoxed}
          <button
            class={cn(
              "flex justify-center items-center bg-bgs1 min-h-12 notouch:hover:bg-bgs1-striped active:bg-bgs2",
              {
                "col-span-4": types.length % 4 === 0,
                "col-span-2": types.length % 4 === 2,
                "w-full h-full col-span-1": types.length % 4 !== 0
              }
            )}
            on:click={() => {
              appStore.runAction(MemotronAction.CAPTURE_SETTINGS);
            }}
          >
            <Icon icon="more-outline-horizontal" />
          </button>
        {/if}
      </div>
    {/await}
  {/key}
  {#if !dev_isBoxed && dev_isEnableEditShortcuts}
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
