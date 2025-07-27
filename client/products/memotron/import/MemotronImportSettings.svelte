<script lang="ts">
  import {
    toasts,
    confirmationNotification
  } from "$lib/client/stores/notification.store";
  import context from "$lib/client/stores/context.store";
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
  import { type ImportHistoryItem } from "./data.type";
  import { enumToString, properCase } from "$lib/shared/utils/text.utils";
  import { nodeStore } from "../node/node.store";
  import MemotronImportAppList from "./MemotronImportAppList.svelte";
  import { Preference } from "$lib/client/stores/preferences/preferences.type";
  import {
    removeDuplicatesFilter,
    resourceInList
  } from "$lib/client/components/flux/resourceStores/resource.utils";
  import { collectionStore } from "$lib/client/components/collection/collection.store";
  import { linker } from "../linking/link.store";

  let importHistoryData: (Omit<
    ImportHistoryItem,
    "source" | "totalRecords" | "status" | "createdAt"
  > & {
    source: string;
    totalRecords: string;
    status: string;
    createdAt: string;
  })[] = [];

  function handleDeleteImportEntry(importId: string) {
    confirmationNotification.notify({
      title: "Revert this import",
      message:
        "Are you sure you want to revert this import? This will delete all imported nodes and collections.",
      confirmAction: {
        label: "Revert",
        variant: ButtonVariant.DANGER,
        callback: () => revertImport(importId)
      }
    });
  }

  async function revertImport(importId: string) {
    try {
      const imports =
        (preferences.resolve(
          Preference.IMPORT_HISTORY
        ) as ImportHistoryItem[]) || [];
      const importRecord = imports.find(resourceInList(importId));
      if (!importRecord) {
        toasts.error("Import record not found");
        return;
      }
      if (importRecord.status === "REVERTED") {
        toasts.error("Import already reverted");
        return;
      }
      const nodesResult = await nodeStore.selectMany({
        filters: {
          importId: importId.toString()
        }
      });

      const collectionsResult = await collectionStore.selectMany({
        filters: {
          importId: importId.toString()
        }
      });

      const linksResult = await linker.selectMany({
        filters: {
          importId: importId.toString()
        }
      });

      const nodeIds = nodesResult.map((node: any) => node.id);
      await nodeStore.deleteMany(nodeIds);

      const collectionIds = collectionsResult.map(
        (collection: any) => collection.id
      );
      await collectionStore.deleteMany(collectionIds);

      const linkIds = linksResult.map((link: any) => link.id);
      await linker.deleteMany(linkIds);

      const updatedImports = imports.map((item: ImportHistoryItem) =>
        item.id === importId ? { ...item, status: "REVERTED" } : item
      );
      preferences.save(Preference.IMPORT_HISTORY, updatedImports);

      toasts.success("Import reverted successfully");
      refreshImportHistory();
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
        body: "Revert import"
      },
      width: 0.1,
      type: TableCellType.ACTION,
      action: (data: ImportHistoryItem) => {
        handleDeleteImportEntry(data.id);
      }
    }
  ];

  function refreshImportHistory() {
    const imports =
      (preferences.resolve(Preference.IMPORT_HISTORY) as ImportHistoryItem[]) ||
      [];
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
        totalRecords: item.totalRecords
          ? `${item.totalRecords.nodes}${item.totalRecords.collections ? ` + ${item.totalRecords.collections} collections` : ""}`
          : "N/A",
        status:
          item.status === "SUCCESS"
            ? "✅ Success"
            : item.status === "FAILED"
              ? "❌ Failed"
              : item.status === "REVERTED"
                ? "🔄 Reverted"
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
    <MemotronImportAppList />
    <div class="flex flex-col w-full flex-grow gap-3">
      <div class="text-left mo:text-b2">Import history</div>
      <div class="flex w-full flex-grow">
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
  </div>
{/if}
