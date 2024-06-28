<script lang="ts">
  import { page } from "$app/stores";
  import { onMount } from "svelte";
  import NodeView from "../node/NodeView.svelte";
  import Timeline from "./timeline/Timeline.svelte";
  let id = "";
  // $: id = $page.url.searchParams.get("node") ?? "";
  $: console.log({ id });
  onMount(() => {
    const sub = page.subscribe((value) => {
      id = value.url.searchParams.get("node") ?? "";
    });
    return () => {
      sub();
    };
  });
</script>

<div class="flex w-full h-full bg-bgs1 gap-2 p-4">
  <!-- <div class="bg-bgs2 p-4 2k:p-6 w-[24rem] min-w-[24rem] 2k:min-w-[32rem]">
    <Timeline parentBgIndex={2} context="journal-modal-viewer" />
  </div> -->
  <NodeView {id} />
</div>
<!-- <ModalCloseButton path={MemotronAction.JOURNAL_MODAL_VIEWER} /> -->
