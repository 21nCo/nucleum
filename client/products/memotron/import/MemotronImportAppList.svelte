<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import Button from "$lib/client/elements/button/Button.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import { ButtonStyle, ButtonVariant } from "$lib/client/types/button.type";
  import Text from "$lib/client/elements/text/Text.svelte";
  import { TextStyle } from "$lib/client/types/text.enum";
  import view from "$lib/client/stores/view.store";
  import { appStore } from "$lib/client/stores/app.store";
  import { ImportSource } from "./data.type";
  import { MemotronAction } from "../memotronAction.enum";
  import { enumToString, properCase } from "$lib/shared/utils/text.utils";
  import Icon from "$lib/client/elements/Icon.svelte";

  const dispatch = createEventDispatcher();

  const availableImports = [
    {
      source: ImportSource.POCKET,
      name: "Pocket",
      description: "Import your saved bookmarks from Pocket as web page nodes",
      icon: "mynaui:brand-pocket-solid",
      formats: ".zip file",
      isAvailable: true
    }
  ];

  function triggerImport(source: ImportSource) {
    appStore.runAction(MemotronAction.IMPORT_APP_DATA, {
      componentParams: { importSource: source }
    });
    dispatch("importTriggered", { source });
  }

  function onImportComplete() {
    dispatch("importComplete");
  }
</script>

<div class="flex flex-col gap-4">
  <Text style={TextStyle.PANEL_HEADING} content="Import from other apps" />

  <div class="grid gap-4 {$view.isPortrait ? 'grid-cols-1' : 'grid-cols-2'}">
    {#each availableImports as importApp}
      <div
        class="flex flex-col gap-3 p-4 border border-brs2 rounded-lg bg-bgs1"
      >
        <div class="flex items-center gap-3">
          <div
            class="w-8 h-8 bg-bgs3 rounded-lg flex items-center justify-center"
          >
            <Icon icon={importApp.icon} size={Size.sm} />
          </div>
          <div class="flex-1">
            <div class="text-b2 text-fgs1 font-medium">{importApp.name}</div>
            <div class="text-b4 text-fgs3">Format: {importApp.formats}</div>
          </div>
        </div>

        <div class="text-b3 text-fgs2">{importApp.description}</div>

        <div class="flex justify-end">
          <Button
            size={Size.sm}
            type={ButtonVariant.PRIMARY}
            style={ButtonStyle.OUTLINED}
            isDisabled={!importApp.isAvailable}
            on:click={() => triggerImport(importApp.source)}
          >
            Import from {importApp.name}
          </Button>
        </div>
      </div>
    {/each}
  </div>

  <div class="text-b4 text-fgs3">
    More import sources coming soon. Have a request? Let us know on our Discord.
  </div>
</div>
