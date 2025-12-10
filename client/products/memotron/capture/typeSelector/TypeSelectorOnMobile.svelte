<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import { Size } from "@21n/types/size.enum";
  import CaptureDraftsAction from "@21n/products/memotron/capture/draftSelector/CaptureDraftsAction.svelte";
  import { CaptureMethod } from "@21n/products/memotron/capture/capture.type";
  import { cn } from "@21n/utils/ui.utils";
  import ScrollViewBottomSpacer from "@21n/layout/scrollView/ScrollViewBottomSpacer.svelte";
  import TypeSelectorItem from "@21n/products/memotron/capture/typeSelector/TypeSelectorItem.svelte";
  import { collectionStore } from "@21n/components/collection/collection.store";
  import InlineErrorMessage from "@21n/elements/text/InlineErrorMessage.svelte";
  import Icon from "@21n/elements/Icon.svelte";
  import { appStore } from "@21n/stores/app.store";
  import ComponentBaseLayer from "@21n/layout/layers/ComponentBaseLayer.svelte";
  import { Resource } from "@21n/components/flux/resourceStores/resource.enum";
  import { MemotronAction } from "@21n/products/memotron/memotronAction.enum";
  import { CollectionObjectKey } from "@21n/components/collection/collection.type";
  import context from "@21n/stores/context.store";
  const dispatch = createEventDispatcher();
  export let selected: CaptureMethod | undefined = undefined;
  export let isBoxedLayout = true;
  let types: any[] = [];
  const isDev = import.meta.env.DEV;
  const baseTypes = [
    { icon: "microphone", label: "Record", value: CaptureMethod.AUDIO },
    { icon: "camera", label: "Camera", value: CaptureMethod.CAMERA },
    ...(isDev
      ? [
          {
            icon: "ri:sketching",
            label: "Sketch",
            value: CaptureMethod.SKETCH
          },
          {
            icon: "scan",
            label: "Scan",
            value: CaptureMethod.SCAN
          },
          {
            icon: "globe",
            label: "From web",
            value: CaptureMethod.WEB
          }
        ]
      : []),
    { icon: "upload", label: "File", value: CaptureMethod.UPLOAD },
    !$context.isEmbed && {
      icon: "clipboard",
      label: "Paste",
      value: CaptureMethod.PASTE
    }
  ].filter(Boolean);

  async function refreshTypes() {
    const typesResult = await collectionStore.resolveCaptureShortcuts();
    types = [
      ...baseTypes,
      ...(typesResult && Array.isArray(typesResult) ? typesResult : [])
    ];
  }

  function handleDraftSelect(event: CustomEvent) {
    dispatch("draftSelect", event.detail);
  }
</script>

<div class="flex--1">
  <div
    class={cn("grid grid-cols-3", {
      "bg-bgs3 gap-[1px] py-[1px]": isBoxedLayout,
      "gap-3": !isBoxedLayout
    })}
  >
    {#await refreshTypes()}
      <div class="col-span-3 flex justify-center bg-bgs1">
        <Icon icon="svg-spinners:3-dots-fade" />
      </div>
    {:then}
      {#each types as item, index (item.value)}
        <div
          class={cn({
            "col-span-2": types.length % 3 === 1 && index === types.length - 1
          })}
        >
          <TypeSelectorItem
            {item}
            isActive={selected === item.value}
            on:select
            on:capture
            on:cancel
            isBoxed={isBoxedLayout}
          />
        </div>
      {/each}

      <button
        class={cn(
          "flex justify-center items-center bg-bgs1 min-h-12 notouch:hover:bg-bgs2 active:bg-bgs2",
          {
            "col-span-3": types.length % 3 === 0,
            "w-full h-full col-span-1": types.length % 3 !== 0
          }
        )}
        on:click={() => {
          appStore.runAction(MemotronAction.CAPTURE_SETTINGS);
        }}
      >
        <Icon icon="more-outline-horizontal" />
      </button>
    {:catch}
      {#each baseTypes as item}
        <TypeSelectorItem
          {item}
          isActive={selected === item.value}
          on:select
          on:capture
          on:cancel
          isBoxed={isBoxedLayout}
        />
      {/each}
      <div class="col-span-3 bg-bgs1 py-2">
        <InlineErrorMessage error="Error loading types." isDissappear={false} />
      </div>
    {/await}
  </div>
  <div class="mt-6">
    <CaptureDraftsAction on:select={handleDraftSelect} size={Size.sm} />
  </div>
  <ScrollViewBottomSpacer />
</div>
<ComponentBaseLayer
  subscribeToResource={new Set([Resource.collection])}
  subscriptionPropsForMergeAction={[
    CollectionObjectKey.isCaptureShortcutEnabled
  ]}
  on:change={refreshTypes}
/>
