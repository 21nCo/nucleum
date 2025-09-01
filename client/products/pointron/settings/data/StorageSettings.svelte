<script lang="ts">
  import view from "$lib/client/stores/view.store";
  import {
    toasts,
    confirmationNotification
  } from "$lib/client/stores/notification.store";
  import { lastImportTime } from "$lib/client/products/pointron/pointron.store";
  import {
    StatusMessageType,
    type StatusMessage
  } from "$lib/client/types/statusMessage.type";
  import InlineInfoBanner from "$lib/client/elements/text/InlineInfoBanner.svelte";
  import context from "$lib/client/stores/context.store";
  import { TextStyle } from "$lib/client/types/text.enum";
  import Text from "$lib/client/elements/text/Text.svelte";
  import type {
    TableColumnItem,
    TableRowItem
  } from "$lib/client/types/tableCell.type";
  import { onMount } from "svelte";
  import ExportData from "./ExportData.svelte";
  // import { PointronPersistence } from "$lib/client/products/pointron/pointron.persistence";
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
  import ImportAppListPart from "./ImportAppListPart.svelte";

  let clearMessage: string | undefined = undefined;
  let fileInput: HTMLInputElement;
  let statusMessage: StatusMessage = {
    message: undefined,
    type: StatusMessageType.DEFAULT
  };
  $: if ($lastImportTime) refreshImportHistory();
  function handleDeleteImportEntry(rowId: string) {
    confirmationNotification.notify({
      title: "Revert this import",
      message: "Are you sure you want to revert this import?",
      confirmAction: {
        label: "Revert",
        variant: ButtonVariant.DANGER
        // callback: () => revertImport(rowId)
      }
    });
  }
  async function revertImport(id: string) {
    //TODO - use latest persistence
    // let response = await new PointronPersistence().revertImport(id);
    // if (response) {
    //   toasts.success("Import reverted successfully");
    //   refreshImportHistory();
    // }
  }

  const columns: TableColumn[] = [
    {
      label: "Date and time",
      key: "created"
    },
    {
      label: "File Name",
      key: "fileName"
    },
    {
      label: "Source",
      key: "source",
      width: 0.3
    },
    {
      label: "Status",
      key: "status",
      width: 0.3
    },
    {
      label: "Actions",
      key: "trash",
      width: 0.1,
      type: TableCellType.ACTION,
      action: (data: any) => {
        handleDeleteImportEntry(data.id);
      }
    }
  ];

  let importHistoryData: TableRowItem[] = [];

  async function refreshImportHistory() {
    //TODO - use latest persistence
    // let response = await new PointronPersistence().fetchImportHistory();
    // importHistoryData = response;
    if (importHistoryData.length > 0) {
      importHistoryData = importHistoryData.map((item) => {
        return {
          ...item,
          created: new Date(item.created).toLocaleString()
        };
      });
    }
  }
  onMount(async () => {
    await refreshImportHistory();
  });
</script>

{#if $context.isEmbed}
  <InlineInfoBanner
    content="We are sorry. Export feature is not currently available on app store distributions. Please use web app to export your data."
    action={{
      label: "Open web app",
      action: "web"
    }}
  />
{:else}
  <div class="flex flex-col gap-8 h-full flex-grow">
    <ImportAppListPart />
    <div class="flex flex-col gap-3">
      <div class="text-left mo:text-b2">Import history</div>
      <div class="w-full">
        {#if !importHistoryData || importHistoryData.length === 0}
          <EmptyStatusView size={Size.sm} subText="No import history found" />
        {:else}
          <Table2 {columns} data={importHistoryData} isStyled={true} />
        {/if}
      </div>
    </div>
    <div class={`flex flex-col ${$view.isPortrait ? `gap-3` : `gap-4`}`}>
      <Text
        width="w-fit"
        style={TextStyle.PANEL_HEADING}
        content="Export data"
      />
      <ExportData />
    </div>
    <ScrollViewBottomSpacer />
    <InlineInfoBanner
      content="**Note:** When a large amount of data is imported, Analytics data may take some time to get reflected. Please bear with us as we work on improving this scenario."
      type={InfoTextType.WARNING}
    />
  </div>
{/if}
