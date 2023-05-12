<script lang="ts">
  import { EventType } from "$lib/tidy/types/event.enum";
  import { onMount, tick } from "svelte";
  import type { CustomEvent } from "$lib/tidy/types/event.type";
  import Popover from "$lib/tidy/components/Popover/Popover.svelte";
  import { Size } from "$lib/tidy/types/size.enum";

  import DebugLayer from "./DebugLayer.svelte";
  import ThemeLayer from "./ThemeLayer.svelte";
  import { appEvents, appStore, currentTime } from "$lib/tidy/stores/app.store";
  import ComponentResolver from "$lib/tidy/layout/paint/ComponentResolver.svelte";
  import Collapse from "$lib/tidy/icons/Collapse.svelte";
  import WithYStack from "./paint/painters/YStack/WithYStack.svelte";
  import { isShowAppearancePreview } from "$lib/tidy/stores/app.store";
  import { appName } from "$lib/local/stores/local.store";

  let isShowAppearancePopover: boolean = false;
  let environment: string;
  let timer: any;
  onMount(() => {
    appEvents.subscribe((x: CustomEvent) => {
      if (x.type == EventType.SHOW_APPEARANCE_PREVIEW) {
        isShowAppearancePopover = x.value ?? false;
      }
    });
    if ($appStore.environment) {
      if ($appStore.environment == "pre") environment = "Preview";
      else if ($appStore.environment == "dev") environment = "Dev";
    }
    clearInterval(timer);
    timer = setInterval(() => {
      tick();
      $currentTime = new Date();
    }, 1000);
    return () => {
      clearInterval(timer);
    };
  });
</script>

<title>{appName}</title>
<div class="flex h-screen w-screen">
  <ThemeLayer>
    <slot />
  </ThemeLayer>
</div>
{#if $appStore.isDebugMode}
  <DebugLayer />
{/if}
{#if environment}
  <div
    class="absolute right-0 top-20 text-bgs1 z-10 w-20 px-2 bg-accent1 opacity-50"
  >
    {environment}
  </div>
{/if}
{#if $appStore.fullScreenComponentPath}
  <div class="fixed left-0 top-0 w-full h-full z-50 px-2 py-4 bg-bgs1">
    <button
      class="mx-2"
      on:click={() => {
        $appStore.fullScreenComponentPath = undefined;
      }}><Collapse /></button
    >
    <ComponentResolver path={$appStore.fullScreenComponentPath} />
  </div>
{/if}
<Popover
  size={Size.xl}
  bind:show={$isShowAppearancePreview}
  isOnRight={true}
  isShowOverlay={false}
  title={"Appearance"}
>
  <WithYStack
    path={"settings/appearance"}
    params={{ parentBackgroundIndex: 2, hidePageHeading: true }}
  />
</Popover>
