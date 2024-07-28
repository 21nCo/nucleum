<script lang="ts">
  import { page } from "$app/stores";
  import { MemotronAction } from "$lib/client/products/memotron/memotronAction.enum";
  import Button from "$lib/client/elements/button/Button.svelte";
  import EditToggleButton from "$lib/client/elements/toggle/EditModeToggle.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import { createEventDispatcher } from "svelte";
  import { appStore } from "$lib/client/stores/app.store";
  import ContextMenuAction from "$lib/client/elements/contextMenu/ContextMenuAction.svelte";
  import type { IActiveNodeStore } from "../node.store";
  import { resolveNodeContextMenu } from "../node.store";
  import { ResourceAccessPoint } from "$lib/client/components/resourceStores/resource.type";
  const dispatch = createEventDispatcher();
  export let node: IActiveNodeStore;
  export let isClonesShown: boolean = false;
  $: backlinksRendered = $page.url.searchParams.get("blr");
  let contextMenu = [];
  $: contextMenu = resolveNodeContextMenu($node, ResourceAccessPoint.SELF);
</script>

<div class="flex items-center gap-4">
  <EditToggleButton isReadModeVariant={true} />
  <Button
    size={Size.sm}
    tooltip="show clones"
    icon="square-3-stack-3d"
    isStayActive={isClonesShown}
    on:click={() => {
      // runAction(MemotronAction.HISTORY, { id });
      dispatch("clones", { id: $node.id });
    }}
  />
  <!--TODO Show only in case of Gathery -->
  <!-- <Button
    size={Size.sm}
    tooltip="Publish"
    icon="share"
    on:click={() => {
      appStore.runAction(MemotronAction.PUBLISH, { id });
    }}
  /> -->
  <Button
    size={Size.sm}
    tooltip="Serendipity"
    icon="light-bulb"
    on:click={() => {
      appStore.runAction(MemotronAction.SERENDIPITY, {
        componentParams: { id: $node.id }
      });
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
      appStore.closeResource();
    }}
  />
</div>
