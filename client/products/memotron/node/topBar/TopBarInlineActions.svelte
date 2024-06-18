<script lang="ts">
  import { page } from "$app/stores";
  import { MemotronEvent } from "$lib/client/types/memotron/memotronEvent.enum";
  import Button from "$lib/client/elements/button/Button.svelte";
  import EditToggleButton from "$lib/client/elements/toggle/EditModeToggle.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import { createEventDispatcher } from "svelte";
  import { appStore, isInEditMode } from "$lib/client/stores/app.store";
  import { closeResource } from "$lib/client/utils/utils";
  import ContextMenuAction from "$lib/client/elements/contextMenu/ContextMenuAction.svelte";
  import type { IActiveNodeStore } from "../node.store";
  const dispatch = createEventDispatcher();
  export let node: IActiveNodeStore;
  export let isClonesShown: boolean = false;
  $: backlinksRendered = $page.url.searchParams.get("blr");
  let contextMenu = [];
  $: contextMenu = [
    {
      group: "all",
      items: [
        {
          value: "edit",
          icon: "pencil",
          callback: () => {
            isInEditMode.toggle();
          }
        },
        {
          label: "Change type",
          value: "change-type",
          icon: "cube",
          callback: () => {}
        },
        {
          value: "export",
          icon: "share",
          callback: () => {}
        },
        {
          value: "share",
          icon: "share",
          callback: () => {
            appStore.runAction(MemotronEvent.PUBLISH, { id: $node.id });
          }
        },
        {
          value: "history",
          icon: "history",
          callback: () => {}
        },
        {
          label: "Copy link",
          value: "link",
          icon: "copy",
          callback: () => {}
        }
      ]
    },
    {
      group: "more",
      items: [
        {
          value: $node.isArchived ? "unarchive" : "archive",
          icon: "archive",
          callback: () => {
            $node.isArchived ? node.unarchive() : node.archive();
          }
        },
        {
          value: $node.trashInformation ? "restore" : "delete",
          icon: "trash",
          callback: () => {
            $node.trashInformation ? node.restore() : node.delete();
          }
        }
      ]
    }
  ];
</script>

<div class="flex items-center gap-4">
  <EditToggleButton isReadModeVariant={true} />
  <Button
    size={Size.sm}
    tooltip="show clones"
    icon="square-3-stack-3d"
    isStayActive={isClonesShown}
    on:click={() => {
      // runAction(MemotronEvent.HISTORY, { id });
      dispatch("clones", { id: $node.id });
    }}
  />
  <!--TODO Show only in case of Gathery -->
  <!-- <Button
    size={Size.sm}
    tooltip="Publish"
    icon="share"
    on:click={() => {
      appStore.runAction(MemotronEvent.PUBLISH, { id });
    }}
  /> -->
  <Button
    size={Size.sm}
    tooltip="Serendipity"
    icon="light-bulb"
    on:click={() => {
      appStore.runAction(MemotronEvent.SERENDIPITY, { id: $node.id });
    }}
  />
  {#if !Boolean(backlinksRendered)}
    <Button
      size={Size.xs}
      label="links"
      on:click={() => {
        dispatch("backlinks", { id: $node.id });
      }}
    />
  {/if}
  <ContextMenuAction {contextMenu} />
  <!--TODO Show close only if launched from modal -->
  <Button
    icon="cross-circled"
    tooltip="Close"
    on:click={() => {
      closeResource();
    }}
  />
</div>
