<script lang="ts">
  import { page } from "$app/stores";
  import { appStore } from "$lib/tidy/stores/app.store";
  import { EmbedContext, LaunchContext } from "$lib/tidy/types/appStore.type";
  import { Orientation } from "$lib/tidy/types/direction.enum";
  import { Size } from "$lib/tidy/types/size.enum";
  import { onMount } from "svelte";
  import ModalFooter from "./ModalFooter.svelte";
  import ModalHeader from "./ModalHeader.svelte";
  export let path: string | undefined = undefined;
  export let id: string | undefined = undefined;
  export let primaryText: string | undefined = undefined;
  export let secondaryText: string | undefined = undefined;
  export let size: Size = Size.md;
  export let orientation: Orientation = Orientation.Vertical;
  let footerRef: any;
  let sizingClass = "";
  resolveSize();
  export function close() {
    footerRef.close();
  }
  onMount(() => {
    let queryParamId = $page.url.searchParams.get("id");
    if (queryParamId && !id) {
      id = queryParamId;
    }
    console.log("id", { queryParamId, id });
    let queryParamPath = $page.url.searchParams.get("path");
    if (queryParamPath && !path) {
      path = queryParamPath;
    }
  });
  function resolveSize() {
    if (orientation === Orientation.Vertical) {
      switch (size) {
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
        default:
          sizingClass = "";
      }
      return;
    }
  }
</script>

<div
  class="flex flex-col items-center justify-between gap-8 py-4 lg:py-8 px-3 md:px-4 lg:px-8 {$appStore.launchContext ===
    LaunchContext.EMBED && $appStore.embedContext === EmbedContext.SHEET
    ? 'w-full h-full'
    : sizingClass}"
>
  <ModalHeader {path} />
  <div class="flex flex-col gap-4 w-full flex-grow">
    <slot />
  </div>
  <ModalFooter
    bind:this={footerRef}
    {primaryText}
    {path}
    on:primary
    on:secondary
    {secondaryText}
  />
</div>
