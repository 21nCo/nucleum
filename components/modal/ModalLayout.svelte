<script lang="ts">
  import { page } from "$app/stores";
  import {
    appStore,
    confirmationNotification,
    modalEvent
  } from "$lib/tidy/stores/app.store";
  import { EmbedContext, LaunchContext } from "$lib/tidy/types/appStore.type";
  import { Orientation } from "$lib/tidy/types/direction.enum";
  import { Size } from "$lib/tidy/types/size.enum";
  import { onMount } from "svelte";
  import ModalFooter from "./ModalFooter.svelte";
  import ModalHeader from "./ModalHeader.svelte";
  import type {
    ModalLayoutParams,
    ModalParams
  } from "$lib/tidy/types/popup.type";
  import { fade, blur, fly, slide, scale, draw } from "svelte/transition";
  import { quintOut } from "svelte/easing";
  import { AppEvent } from "$lib/tidy/types/event.enum";
  export let params: ModalParams;
  export let layoutParams: ModalLayoutParams;
  console.log({ layoutParams });
  if (!layoutParams.size) layoutParams.size = Size.md;
  let footerRef: any;
  let sizingClass = "";
  resolveSize();
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
  function resolveSize() {
    if (
      layoutParams.orientation === Orientation.Vertical ||
      !layoutParams.orientation
    ) {
      switch (layoutParams.size) {
        case Size.xs:
          sizingClass = "w-[18rem] md:w-[20rem] h-[20rem] min-h-[15rem]";
          break;
        case Size.sm:
          sizingClass = "w-[20rem] md:w-[25rem] h-[25rem] min-h-[20rem]";
          break;
        case Size.md:
          sizingClass = "w-[20rem] md:w-[30rem] h-[35rem] min-h-[30rem]";
          break;
        case Size.lg:
          sizingClass =
            "w-[21rem] sm:w-[28rem] md:w-[35rem] h-[45rem] min-h-[40rem]";
          break;
        case Size.xl:
          sizingClass =
            "w-[21rem] sm:w-[30rem] md:w-[40rem] h-[50rem] min-h-[45rem]";
          break;
        case Size.full:
          sizingClass = "w-full h-full min-h-screen min-w-screen";
          break;
        default:
          sizingClass = "w-[20rem] md:w-[30rem] h-[35rem] min-h-[30rem]";
          break;
      }
      return;
    } else if (layoutParams.orientation === Orientation.Horizontal) {
      switch (layoutParams.size) {
        case Size.xs:
          sizingClass = "w-[18rem] md:w-[20rem] h-[20rem] min-h-[15rem]";
          break;
        case Size.sm:
          sizingClass = "w-[20rem] md:w-[25rem] h-[25rem] min-h-[20rem]";
          break;
        case Size.md:
          sizingClass =
            "w-[21rem] sm:w-[30rem] md:w-[45rem] h-[30rem] min-h-[30rem]";
          break;
        case Size.lg:
          sizingClass =
            "w-[21rem] sm:w-[35rem] md:w-[50rem] h-[45rem] min-h-[45rem]";
          break;
        case Size.xl:
          sizingClass =
            "w-[21rem] sm:w-[30rem] md:w-[70rem] h-[50rem] min-h-[45rem]";
          break;
        case Size.full:
          sizingClass = "w-full h-full min-h-screen min-w-screen";
          break;
        default:
          sizingClass =
            "w-[21rem] sm:w-[30rem] md:w-[40rem] h-[25rem] min-h-[25rem]";
          break;
      }
      return;
    }
  }
</script>

{#if layoutParams.size === Size.full}
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
    class="flex flex-col items-center justify-between {$appStore.launchContext ===
      LaunchContext.EMBED && $appStore.embedContext === EmbedContext.SHEET
      ? 'w-full h-full'
      : sizingClass} {!layoutParams.ignoreSafeArea
      ? layoutParams.size === Size.xs
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
    {#if !layoutParams.ignoreSafeArea}
      <ModalHeader {params} />
    {/if}
    <div class="flex flex-col gap-4 w-full flex-grow">
      <slot />
    </div>
    {#if layoutParams?.primaryAction || layoutParams?.secondaryAction}
      <ModalFooter
        primaryAction={layoutParams?.primaryAction}
        secondaryAction={layoutParams?.secondaryAction}
        bind:this={footerRef}
        on:close={() => {
          if (params.path === AppEvent.CONFIRMATION)
            confirmationNotification.reset();
          else modalEvent.hideSpecific(params.path);
        }}
      />
    {/if}
  </div>
{/if}
