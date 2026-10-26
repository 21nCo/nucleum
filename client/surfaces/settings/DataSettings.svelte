<script lang="ts">
  import { requireCommandHost } from "@nucleum/shared-state/commands/command-host";
  import Button from "@21n/ui/elements/button/Button.svelte";
  import Text from "@21n/ui/elements/text/Text.svelte";
  import { appStore } from "@nucleum/shared-state/app-context/app.store";
  import { Action } from "@nucleum/client/config/action.enum";
  import { Product } from "@nucleum/client/config/product.type";
  import { TextStyle } from "@21n/ui/elements/text/text.enum";
  import BackupAndRestore from "./data/BackupAndRestore.svelte";
  import E2eeSettings from "./data/E2eeSettings.svelte";
  import StorageActions from "./data/StorageActions.svelte";
</script>

<main class="flex flex-col gap-12 text-left">
  <BackupAndRestore />
  <E2eeSettings />
  <section class="flex flex-col gap-4">
    <Text content="Import and export" style={TextStyle.SECTION_HEADING} />
    <span class="text-b2 text-fgs2">
      We enormously value your privacy and data. We want to make Memotron as
      interoperable and sustainable as possible. We will keep extending our
      support to import/export data from other apps.
    </span>
    <div>
      {#if $appStore.product !== Product.POINTRON}
        <Button
          label="Import from other apps"
          icon="download"
          onclick={() => {
            requireCommandHost().runAction(Action.IMPORT_FROM_OTHER_APPS);
          }}
        />
      {/if}
    </div>
  </section>
  <StorageActions />
</main>
