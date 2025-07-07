<script lang="ts">
  import view from "$lib/client/stores/view.store";
  import {
    toasts,
    confirmationNotification
  } from "$lib/client/stores/notification.store";
  import context from "$lib/client/stores/context.store";
  import { TextStyle } from "$lib/client/types/text.enum";
  import Text from "$lib/client/elements/text/Text.svelte";
  import { onMount } from "svelte";
  import { ButtonVariant } from "$lib/client/types/button.type";
  import Table2 from "$lib/client/elements/table/Table2.svelte";
  import {
    TableCellType,
    type TableColumn
  } from "$lib/client/types/table.type";
  import ScrollViewBottomSpacer from "$lib/client/layout/scrollView/ScrollViewBottomSpacer.svelte";
  import EmptyStatusView from "$lib/client/elements/feedback/EmptyStatusView.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import { InfoTextType } from "$lib/client/types/text.type";
  import InlineInfoBanner from "$lib/client/elements/text/InlineInfoBanner.svelte";
  import { preferences } from "$lib/client/stores/preferences/preferences.store";
  import { type ImportHistoryItem, ImportSource } from "./data.type";
  import { enumToString, properCase } from "$lib/shared/utils/text.utils";
  import { nodeStore } from "../node/node.store";
  import MemotronImportAppList from "./MemotronImportAppList.svelte";
  import { Preference } from "$lib/client/stores/preferences/preferences.type";
  import { removeDuplicatesFilter } from "$lib/client/components/flux/resourceStores/resource.utils";

  let importHistoryData: ImportHistoryItem[] = [];

  function handleDeleteImportEntry(importId: string) {
    confirmationNotification.notify({
      title: "Revert this import",
      message:
        "Are you sure you want to revert this import? This will delete all imported nodes.",
      confirmAction: {
        label: "Revert",
        variant: ButtonVariant.DANGER,
        callback: () => revertImport(importId)
      }
    });
  }

  async function revertImport(importId: string) {
    try {
      const result = await nodeStore.selectMany({
        filters: {
          "metadata.importId": importId
        }
      });

      if (result?.length) {
        const nodeIds = result.map((node: any) => node.id);
        await nodeStore.deleteMany(nodeIds);

        const imports = preferences.resolve(Preference.IMPORT_HISTORY) || [];
        const updatedImports = imports.filter(
          (item: ImportHistoryItem) => item.id !== importId
        );
        preferences.save(Preference.IMPORT_HISTORY, updatedImports);

        toasts.success("Import reverted successfully");
        refreshImportHistory();
      } else {
        const imports = preferences.resolve(Preference.IMPORT_HISTORY) || [];
        const updatedImports = imports.filter(
          (item: ImportHistoryItem) => item.id !== importId
        );
        preferences.save(Preference.IMPORT_HISTORY, updatedImports);

        toasts.success("Import record removed");
        refreshImportHistory();
      }
    } catch (error) {
      console.error("Error reverting import:", error);
      toasts.error("Failed to revert import");
    }
  }

  const columns: TableColumn[] = [
    {
      label: "Date and time",
      key: "createdAt",
      width: 0.5
    },
    {
      label: "File Name",
      key: "fileName",
      width: 0.5
    },
    {
      label: "Source",
      key: "source",
      width: 0.2
    },
    {
      label: "Records",
      key: "totalRecords",
      width: 0.2
    },
    {
      label: "Status",
      key: "status",
      width: 0.3
    },
    {
      label: "Actions",
      key: "ph:trash-light",
      actionTooltip: {
        body: "Delete import"
      },
      width: 0.1,
      type: TableCellType.ACTION,
      action: (data: ImportHistoryItem) => {
        handleDeleteImportEntry(data.id);
      }
    }
  ];

  function refreshImportHistory() {
    const imports = preferences.resolve(Preference.IMPORT_HISTORY) || [];
    console.log({ imports });
    importHistoryData = imports
      .filter(removeDuplicatesFilter)
      .sort(
        (a: ImportHistoryItem, b: ImportHistoryItem) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      .map((item: ImportHistoryItem) => ({
        ...item,
        createdAt: new Date(item.createdAt).toLocaleString(),
        source: properCase(enumToString(item.source)),
        status:
          item.status === "SUCCESS"
            ? "✅ Success"
            : item.status === "FAILED"
              ? "❌ Failed"
              : "⏳ In Progress"
      }));
  }
</script>

{#if $context.isEmbed}
  <InlineInfoBanner
    content="Import features are currently not available on app store distributions. Please use web app to import data."
    action={{
      label: "Open web app",
      action: "web"
    }}
  />
{:else}
  <div class="flex flex-col gap-8 h-full flex-grow">
    <MemotronImportAppList on:importComplete={refreshImportHistory} />

    <div class="flex flex-col gap-3">
      <div class="text-left mo:text-b2">Import history</div>
      <div class="w-full">
        {#await refreshImportHistory()}
          <EmptyStatusView isLoadingState={true} />
        {:then}
          {#if !importHistoryData || importHistoryData.length === 0}
            <EmptyStatusView size={Size.sm} subText="No import history found" />
          {:else}
            <Table2 {columns} data={importHistoryData} isStyled={true} />
          {/if}
        {:catch}
          <EmptyStatusView
            size={Size.sm}
            subText="Error loading import history"
          />
        {/await}
      </div>
    </div>

    <ScrollViewBottomSpacer />

    <InlineInfoBanner
      content="**Note:** When importing data, it may take a moment for all items to be processed. Each import creates individual web page nodes that can be searched and organized."
      type={InfoTextType.INFO}
    />
  </div>
{/if}
