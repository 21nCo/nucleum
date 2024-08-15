<script lang="ts">
  import Button from "$lib/client/elements/button/Button.svelte";
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
  import { PointronAction } from "$lib/client/types/pointron/pointronAction.enum";
  import { OtherApps } from "$lib/client/types/pointron/otherApps.enum";
  import { TextStyle } from "$lib/client/types/text.enum";
  import Text from "$lib/client/elements/text/Text.svelte";
  import type {
    TableColumnItem,
    TableRowItem
  } from "$lib/client/types/tableCell.type";
  import { onMount } from "svelte";
  import ExportData from "./ExportData.svelte";
  import { PointronPersistence } from "$lib/client/products/pointron/pointron.persistence";
  import { ButtonVariant } from "$lib/client/types/button.type";
  import { appStore } from "$lib/client/stores/app.store";
  import type { IPointSession } from "../../logs/log.type";
  import Table2 from "$lib/client/elements/table/Table2.svelte";
  import {
    TableCellType,
    type TableColumn
  } from "$lib/client/types/table.type";

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
        variant: ButtonVariant.DANGER,
        callback: () => revertImport(rowId)
      }
    });
  }
  async function revertImport(id: string) {
    let response = await new PointronPersistence().revertImport(id);
    if (response) {
      toasts.success("Import reverted successfully");
      refreshImportHistory();
    }
  }

  const OtherAppsForImport = [
    {
      label: "Atracker",
      id: OtherApps.ATRACKER
    },
    {
      label: "Session",
      id: OtherApps.SESSION
    },
    {
      label: "Toggl track",
      id: OtherApps.TOGGL_TRACK
    },
    {
      label: "Timemator",
      id: OtherApps.TIMEMATOR
    },
    {
      label: "Pointron",
      id: "POINTRON"
    }
  ];

  const importHistoryColumns: TableColumnItem[] = [
    // {
    //   label: "Id",
    //   key: "id"
    //   // width: "min-w-[7rem]",
    // },
    {
      label: "Date and time",
      key: "created"
      // width: "min-w-[10rem]",
    },
    {
      label: "File Name",
      key: "fileName"
      // width: "min-w-[7rem]",
    },
    {
      label: "Source",
      key: "source"
      // width: "min-w-[7rem]",
    },
    {
      label: "Status",
      key: "status",
      // width: "min-w-[7rem]",
      render: (status: string) => {
        return `<div class="capitalize flex gap-1 justify-center items-center"> <span class="w-[4px] h-[4px] bg-fgs1 rounded-full"></span> ${status}</div>`;
      }
    },
    {
      label: "",
      key: "delete",
      icon: "trash",
      width: "w-[2rem]",
      action: (rowId: string) => {
        handleDeleteImportEntry(rowId);
      }
    }
  ];

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

  // function exportPreferences() {
  //   let preferences = JSON.stringify({
  //     global: $userPreferences,
  //     local: $userLocalPreferences,
  //     tags: $tagStore
  //   });
  //   if (!preferences) return;
  //   const dataJSON = preferences;
  //   download(dataJSON, "preferences");
  // }
  function isValidUserPreferences(item: any) {
    return (
      item &&
      item.global &&
      item.local &&
      item.tags &&
      typeof item.tags === "object"
    );
  }
  function isValidSessionType(item: any): item is IPointSession {
    return (
      item && typeof item.elapsed === "number" && typeof item.start === "number"
    );
  }

  function isListOfSessions(data: any) {
    return (
      data &&
      Array.isArray(data.sessions) &&
      Array.isArray(data.tasks) &&
      data.sessions?.every(isValidSessionType)
    );
  }

  function onImportButtonClick(id: OtherApps) {
    appStore.runAction(PointronAction.IMPORT_APP_DATA, {
      componentParams: { id }
    });
  }
  async function refreshImportHistory() {
    let response = await new PointronPersistence().fetchImportHistory();
    importHistoryData = response;
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
  <div class="flex flex-col gap-8 max-w-[1000px] h-full flex-grow">
    <div class="flex flex-col gap-3">
      <div class="text-left mo:text-b2 text-fgs2">
        Pick an App to import data from:
      </div>
      <div
        class="protrait:grid portrait:grid-cols-2 portrait:gap-3 flex gap-4 flex-wrap"
      >
        {#each OtherAppsForImport as { label, id }}
          <Button on:click={() => onImportButtonClick(id)} {label} />
        {/each}
      </div>
    </div>

    <div class="flex flex-col gap-3">
      <div class="text-left mo:text-b2">Import history</div>
      <div class="w-full">
        <Table2 {columns} data={importHistoryData} />
        <!-- <ComingSoonView
        size={Size.sm}
        subText="Import history will be available soon..."
      /> -->
      </div>
    </div>
    <div class={`flex flex-col ${$view.isPortrait ? `gap-3` : `gap-4`}`}>
      <Text
        width="w-fit"
        style={TextStyle.PANEL_HEADING}
        content="Export data"
      />
      <ExportData />
      <!-- <div class="flex gap-2">
      <Button
        label={"Export session data (JSON)"}
        on:click={exportSessionData}
      />
      <Button
        label={"Export preferences (JSON)"}
        on:click={exportPreferences}
      />
    </div> -->
    </div>
  </div>
{/if}
