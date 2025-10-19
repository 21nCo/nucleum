<script lang="ts">
  // import { PointronPersistence } from "$lib/client/products/pointron/pointron.persistence";
  import Icon from "@21n/elements/Icon.svelte";
  import Button from "@21n/elements/button/Button.svelte";
  import { toasts } from "@21n/stores/notification.store";
  import { ButtonVariant } from "@21n/types/button.type";
  import { AlertType } from "@21n/types/notification.type";
  import { Size } from "@21n/types/size.enum";
  import { isEmptyArray, isValidArray } from "@21n/shared-utils/obj.utils";
  import { generateUID } from "@21n/utils/utils";
  import { createEventDispatcher } from "svelte";
  import InlineInfoBanner from "@21n/elements/text/InlineInfoBanner.svelte";
  import { parse } from "@21n/shared-utils/json.utils";
  const dispatch = createEventDispatcher();
  let fileInput: HTMLInputElement;
  let isProcessingImport: boolean = false;
  let fileName: string = "";
  let fileSize: number = 0;
  let jsonData: any;
  function isValidImportData(rawJson: any) {
    return (
      rawJson &&
      isValidArray(rawJson.goals) &&
      isValidArray(rawJson.tags) &&
      isValidArray(rawJson.logs) &&
      isValidArray(rawJson.sessions) &&
      !(
        isEmptyArray(rawJson.goals) &&
        isEmptyArray(rawJson.tags) &&
        isEmptyArray(rawJson.logs) &&
        isEmptyArray(rawJson.sessions)
      )
    );
  }
  async function importData() {
    if (!fileInput.files) return;
    const file = fileInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedData = event.target?.result;
        if (!importedData) return;
        jsonData = parse(importedData as string);
        console.log({ jsonData });
        if (isValidImportData(jsonData)) {
          fileName = file.name;
          fileSize = file.size;
          console.log({ fileName, fileSize });
        }
      } catch (error) {
        console.error("Error parsing JSON file:", error);
        isProcessingImport = false;
        toasts.error("Invalid file selected");
      }
    };
    reader.readAsText(file);
  }
  async function processImport() {
    isProcessingImport = true;
    if (!jsonData) {
      toasts.error("Please select a valid file");
      isProcessingImport = false;
      return;
    }
    // const response = await new PointronPersistence().importData(
    //   jsonData,
    //   fileName,
    //   fileSize
    // );
    // if (response) {
    //   toasts.success("Data imported successfully");
    //   dispatch("refresh");
    //   resetFile();
    // } else {
    //   toasts.error("Error importing data. Please try again");
    // }
    isProcessingImport = false;
  }

  function resetFile() {
    fileInput.value = "";
    fileName = "";
    jsonData = null;
  }
</script>

<div class="flex flex-col w-full gap-4 p-4 px-6 bg-bgs2 rounded-md">
  <div class="flex w-full justify-between">
    <div class="flex items-center gap-2">
      <input
        type="file"
        id="fileInput"
        bind:this={fileInput}
        on:change={importData}
        accept=".json"
        class="hidden"
      />
      <label
        for="fileInput"
        class="bg-bgs3 rounded-md py-2 px-3 cursor-pointer"
      >
        Choose File
      </label>
      {#if fileName}
        {fileName}
        <Icon icon="cross" on:click={resetFile} />
      {/if}
    </div>

    <Button
      size={Size.sm}
      on:click={processImport}
      type={ButtonVariant.PRIMARY}
      label={isProcessingImport ? "Uploading..." : "Import"}
      isLoading={isProcessingImport}
    />
  </div>
  <div class="self-start text-b3">
    <b>Note:</b> Only Pointron exported <i>.json</i> is currently accepted
  </div>
</div>
{#if isProcessingImport}
  <InlineInfoBanner
    content="**Import in progress.** Kindly **do not close this tab** until the import is complete. Import might take a few seconds or upto a minute depending on the amount of data."
  />
{/if}
