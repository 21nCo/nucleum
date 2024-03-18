<script lang="ts">
  import { page } from "$app/stores";
  import { appStore } from "$lib/tidy/stores/app.store";
  import modalEvent from "$lib/tidy/components/modal/modal.store";
  import { confirmationNotification } from "$lib/tidy/stores/notification.store";
  import { EmbedContext, LaunchContext } from "$lib/tidy/types/appStore.type";
  import { Orientation } from "$lib/tidy/types/direction.enum";
  import { Size } from "$lib/tidy/types/size.enum";
  import { onMount } from "svelte";
  import ModalFooter from "./ModalFooter.svelte";
  import ModalHeader from "./ModalHeader.svelte";
  import type { ModalParams } from "$lib/tidy/types/popup.type";
  import { fade, blur, fly, slide, scale, draw } from "svelte/transition";
  import { quintOut } from "svelte/easing";
  import { AppEvent } from "$lib/tidy/types/event.enum";
  export let path: string;
  export let params: ModalParams;
  let size: Size = Size.md;
  // let orientation: Orientation = Orientation.Vertical;
  // if (params.layout?.size) size = params.layout.size;
  // if (params.layout?.orientation) orientation = params.layout.orientation;
  let footerRef: any;
  export function close() {
    footerRef.close();
  }
  onMount(() => {
    // let queryParamId = $page.url.searchParams.get("id");
    // if (queryParamId && !params?.id) {
    //   params.id = queryParamId;
    // }
    // let queryParamPath = $page.url.searchParams.get("path");
    // if (queryParamPath && !params?.path) {
    //   params.path = queryParamPath;
    // }
    // console.log("id", { queryParamId, queryParamPath, params });
  });

  function handleClose() {
    if (path === AppEvent.CONFIRMATION) confirmationNotification.reset();
    else modalEvent.hideSpecific(path, "ModalLayout.svelte");
  }
</script>

{#if size === Size.full}
  <div
    in:fly={{
      duration: 500,
      delay: 0,
      easing: quintOut,
      x: 0,
      y: 100,
      opacity: 0
    }}
    class="w-full h-full flex justify-center items-center"
  >
    <slot />
  </div>
{:else}
  <div
    class="flex flex-col items-center justify-between w-full h-full {!params
      .layout?.ignoreSafeArea
      ? size === Size.xs
        ? 'p-2 lg:p-4 gap-4'
        : 'py-4 lg:py-8 px-3 md:px-4 lg:px-8 gap-8'
      : ''}"
    in:fly={{
      duration: 500,
      delay: 0,
      easing: quintOut,
      x: 0,
      y: 100,
      opacity: 0
    }}
  >
    {#if params.title && $appStore.launchContext != LaunchContext.EMBED}
      <ModalHeader
        title={params.title}
        on:close={() => handleClose()}
        isShowClose={params.layout?.isShowClose}
      />
    {/if}
    <div class="flex flex-col gap-4 w-full flex-grow">
      <slot />
    </div>
    {#if params.layout?.primaryAction || params.layout?.secondaryAction}
      <ModalFooter
        primaryAction={params.layout?.primaryAction}
        secondaryAction={params.layout?.secondaryAction}
        bind:this={footerRef}
        on:close={() => handleClose()}
        isShowClose={params.layout?.isShowClose}
      />
    {/if}
  </div>
{/if}
