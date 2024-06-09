<script lang="ts">
  import Button from "$lib/client/elements/button/Button.svelte";

  import type { UserGlobalPreferences } from "$lib/client/types/preferences.type";
  import { removeDuplicatesById } from "$lib/client/utils/obj.utils";
  import view from "$lib/client/stores/view.store";
  import {
    toasts,
    confirmationNotification
  } from "$lib/client/stores/notification.store";
  import {
    tagStore,
    pointronPreferences
  } from "$lib/client/components/pointron/pointron.store";
  import {
    StatusMessageType,
    type StatusMessage
  } from "$lib/client/types/statusMessage.type";
  import StatusMessageText from "$lib/client/elements/text/StatusMessageText.svelte";
  import { PointronEventEnum } from "$lib/client/types/pointron/pointronEvent.enum";
  import { OtherApps } from "$lib/client/types/pointron/otherApps.enum";
  import { TextStyle } from "$lib/client/types/text.enum";
  import Text from "$lib/client/elements/text/Text.svelte";
  import Table from "$lib/client/elements/table/Table.svelte";
  import type {
    TableColumnItem,
    TableRowItem
  } from "$lib/client/types/tableCell.type";
  import { onMount } from "svelte";
  import ComingSoonView from "$lib/client/elements/ComingSoonView.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import ExportData from "./ExportData.svelte";
  import ImportData from "./ImportData.svelte";
  import { PointronPersistence } from "$lib/client/components/pointron/pointron.persistence";
  import { ButtonVariant } from "$lib/client/types/button.type";
  import { download, generateUID } from "$lib/client/utils/utils";
  import { AlertType } from "$lib/client/types/notification.type";
  import { appStore } from "$lib/client/stores/app.store";
  import type { PointSessionDbType } from "../../logs/log.type";

  let clearMessage: string | undefined = undefined;
  let fileInput: HTMLInputElement;
  let statusMessage: StatusMessage = {
    message: undefined,
    type: StatusMessageType.DEFAULT
  };

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
    }
  ];

  const importHistoryColumns: TableColumnItem[] = [
    {
      label: "Id",
      key: "id"
      // width: "min-w-[7rem]",
    },
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
    // {
    //   label: "Status",
    //   key: "status",
    //   // width: "min-w-[7rem]",
    //   render: (status: string) => {
    //     return `<div class="text-ags1 capitalize flex gap-1 items-center"> <span class="w-[4px] h-[4px] bg-ags1 rounded-full"></span> ${status}</div>`;
    //   }
    // },
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
  function isValidSessionType(item: any): item is PointSessionDbType {
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
    appStore.runAction(PointronEventEnum.IMPORT_APP_DATA, { id });
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

<div class="flex flex-col gap-8 max-w-[1000px] h-full flex-grow">
  <div class="flex flex-col gap-3">
    <div class={`text-fgs2 ${$view.isPortrait ? `text-b4` : `text-base`}`}>
      Importing from other apps will be available soon...
    </div>
    <div
      class={$view.isPortrait
        ? `grid grid-cols-2 gap-3`
        : `flex gap-4 flex-wrap `}
    >
      <!-- {#each OtherAppsForImport as { label, id }}
        <Button
          width={`${$windowObject.isInPortraitMode ? `w-full` : `w-fit`}`}
          on:click={() => onImportButtonClick(id)}
          {label}
        />
      {/each} -->
    </div>
    <ImportData on:refresh={refreshImportHistory} />
  </div>

  <div class="flex flex-col gap-3">
    <div class={`text-fgs1 ${$view.isPortrait ? `text-b2` : `text-base`}`}>
      Import history
    </div>
    <div class={$view.isPortrait ? `` : `w-full max-w-[1000px]`}>
      <Table
        width={"w-full"}
        columns={importHistoryColumns}
        data={importHistoryData}
      />
      <!-- <ComingSoonView
        size={Size.sm}
        subText="Import history will be available soon..."
      /> -->
    </div>
  </div>
  <div class={`flex flex-col ${$view.isPortrait ? `gap-3` : `gap-4`}`}>
    <Text width="w-fit" style={TextStyle.PANEL_HEADING} content="Export data" />
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
