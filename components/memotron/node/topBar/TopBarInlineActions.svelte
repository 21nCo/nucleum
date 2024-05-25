<script lang="ts">
  import { page } from "$app/stores";
  import { MemotronEvent } from "$lib/tidy/types/memotron/memotronEvent.enum";
  import Button from "$lib/tidy/elements/button/Button.svelte";
  import EditToggleButton from "$lib/tidy/elements/toggle/EditModeToggle.svelte";
  import modalEvent from "$lib/tidy/components/modal/modal.store";
  import { Size } from "$lib/tidy/types/size.enum";
  import { createEventDispatcher } from "svelte";
  import { appStore } from "$lib/tidy/stores/app.store";
  const dispatch = createEventDispatcher();
  export let id: string;
  export let isClonesShown: boolean = false;
  $: backlinksRendered = $page.url.searchParams.get("blr");
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
      dispatch("clones", { id });
    }}
  />
  <!--TODO Show only in case of Gathery -->
  <Button
    size={Size.sm}
    tooltip="Publish"
    icon="share"
    on:click={() => {
      appStore.runAction(MemotronEvent.PUBLISH, { id });
    }}
  />
  <Button
    size={Size.sm}
    tooltip="Serendipity"
    icon="light-bulb"
    on:click={() => {
      appStore.runAction(MemotronEvent.SERENDIPITY, { id });
    }}
  />
  {#if !Boolean(backlinksRendered)}
    <Button
      size={Size.xs}
      label="links"
      on:click={() => {
        dispatch("backlinks", { id });
      }}
    />
  {/if}
  <Button icon="ellipsis-vertical" tooltip="More actions" />
  <!--TODO Show close only if launched from modal -->
  <Button
    icon="cross-circled"
    tooltip="Close"
    on:click={() => {
      modalEvent.hide();
    }}
  />
</div>
