<script lang="ts">
  import view from "$lib/client/stores/view.store";
  import modalEvent from "$lib/client/components/modal/modal.store";
  import Icon from "$lib/client/elements/Icon.svelte";
  import Button from "$lib/client/elements/button/Button.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import FileItem from "./FileItem.svelte";
  import { UploadStatus } from "$lib/client/types/uploadStatus.enum";
  import { convertFileSize } from "$lib/client/utils/utils";
  import { FileSizeMeasurement } from "$lib/client/types/fileSizeMeasurement.enum";
  import { toasts } from "$lib/client/stores/notification.store";
  import { ImportSource, StepType, type ImportHistoryItem } from "./data.type";
  import { ButtonStyle, ButtonVariant } from "$lib/client/types/button.type";
  import Divider from "$lib/client/elements/Divider.svelte";
  import { Display } from "$lib/client/types/view.type";
  import { enumToString, properCase } from "$lib/shared/utils/text.utils";
  import { renderMdAsHtml } from "$lib/client/components/markdown/markdown.utils";
  import { nodeStore } from "../node/node.store";
  import { NodeType } from "../node/node.type";
  import { generateResourceId } from "$lib/shared/utils/surreal.utils";
  import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
  import { sanitizeAndResolve } from "../node/url.utils";
  import { preferences } from "$lib/client/stores/preferences/preferences.store";
  import { MemotronAction } from "../memotronAction.enum";
  import { Preference } from "$lib/client/stores/preferences/preferences.type";
  import JSZip from "jszip";

  export let importSource: ImportSource = ImportSource.POCKET;

  let inputRef: HTMLInputElement;
  let activeStepIndex: number = 0;

  let locallyUploadedFiles: FileList | null = null;
  let tempFileList:
    | {
        label: string;
        size: number;
        file: File;
        uploadStatus: UploadStatus;
        uploadProgress: number;
      }[]
    | null = null;

  const filesLimit = 5;

  let isEverythingUploaded: boolean = false;
  let isUploading: boolean = false;

  const importSourceConfig = {
    [ImportSource.POCKET]: {
      name: "Pocket",
      fileFormats: ["CSV"],
      acceptedFiles: ".zip",
      maxSizeText: "10MB",
      maxFileSize: 10000000,
      steps: [
        {
          subTitle: "Let us guide you through importing data from Pocket",
          description:
            "Step 1: Prepare your data in a ZIP file containing CSV files from your Pocket export. The ZIP can contain multiple CSV files.",
          type: StepType.NON_INTERACTIVE
        },
        {
          subTitle: "Let us guide you through importing data from Pocket",
          description:
            "Step 2: Ensure your ZIP file contains CSV files with bookmark data. Each CSV file will be processed using the existing CSV parsing functionality.",
          type: StepType.NON_INTERACTIVE
        },
        {
          subTitle:
            "Note: Each bookmark from Pocket will become a web page node in Memotron. Multiple CSV files in the ZIP will be processed.",
          description: "Upload the ZIP file containing your exported data.",
          type: StepType.UPLOAD
        }
      ]
    }
    // Example: Different sources can have different file formats and acceptance patterns
    // [ImportSource.CHROME_BOOKMARKS]: {
    //   name: "Chrome Bookmarks",
    //   fileFormats: ["CSV", "JSON"],
    //   acceptedFiles: ".zip,.csv,.json",
    //   maxSizeText: "25MB",
    //   maxFileSize: 25000000, // 25MB in bytes
    //   steps: [...]
    // },
    // [ImportSource.NOTION_EXPORT]: {
    //   name: "Notion",
    //   fileFormats: ["Markdown", "CSV"],
    //   acceptedFiles: ".zip,.md",
    //   maxSizeText: "50MB",
    //   maxFileSize: 50000000, // 50MB in bytes
    //   steps: [...]
    // }
  };

  function getImportConfig(source: ImportSource) {
    return (
      importSourceConfig[source] || importSourceConfig[ImportSource.POCKET]
    );
  }

  function getImportSteps(source: ImportSource) {
    return getImportConfig(source).steps;
  }

  function getImportSourceName(source: ImportSource) {
    return getImportConfig(source).name;
  }

  function getAcceptedFileTypes(source: ImportSource) {
    return getImportConfig(source).acceptedFiles;
  }

  function getFileFormatNote(source: ImportSource) {
    const config = getImportConfig(source);
    const formatsText = config.fileFormats.join(", ");
    return `File format: ${formatsText} (in ZIP), max size: ${config.maxSizeText}`;
  }

  // Reactive values based on import source
  $: accept = getAcceptedFileTypes(importSource);
  $: note = getFileFormatNote(importSource);

  function onJumpToUpload() {
    activeStepIndex = getImportSteps(importSource)?.length - 1;
  }

  function onNext() {
    if (activeStepIndex < getImportSteps(importSource)?.length - 1) {
      activeStepIndex++;
    }
  }

  function resetFileInput() {
    locallyUploadedFiles = null;
    inputRef ? (inputRef.value = "") : "";
  }

  function onBack() {
    resetFileInput();
    if (activeStepIndex > 0) {
      activeStepIndex--;
    }
  }

  function keepIncreasingProgress() {
    const interval = setInterval(() => {
      if (tempFileList) {
        tempFileList = tempFileList?.map((item) => {
          if (item.uploadProgress < 90) {
            return {
              ...item,
              uploadProgress: item.uploadProgress + 1
            };
          }
          return item;
        });

        if (isEverythingUploaded) {
          clearInterval(interval);
          tempFileList = tempFileList.map((item) => {
            return {
              ...item,
              uploadStatus: UploadStatus.UPLOADED,
              uploadProgress: 100
            };
          });
        }
      }
    }, 500);
  }

  function parsePocketCSV(csvText: string) {
    const lines = csvText.split("\n").filter((line) => line.trim());
    const headers = lines[0].split(",").map((h) => h.replace(/"/g, "").trim());

    const urlIndex = headers.findIndex((h) => h.toLowerCase().includes("url"));
    const titleIndex = headers.findIndex(
      (h) =>
        h.toLowerCase().includes("title") || h.toLowerCase().includes("name")
    );
    const tagsIndex = headers.findIndex((h) =>
      h.toLowerCase().includes("tags")
    );
    const timeIndex = headers.findIndex(
      (h) =>
        h.toLowerCase().includes("time_added") ||
        h.toLowerCase().includes("date") ||
        h.toLowerCase().includes("created_at")
    );
    const statusIndex = headers.findIndex((h) =>
      h.toLowerCase().includes("status")
    );

    const records = [];

    for (let i = 1; i < lines.length; i++) {
      const columns = lines[i].split(",");
      if (columns.length < 2) continue;

      const url = columns[urlIndex]?.replace(/"/g, "").trim();
      const title = columns[titleIndex]?.replace(/"/g, "").trim();
      const tags = columns[tagsIndex]?.replace(/"/g, "").trim();
      const timestamp = columns[timeIndex]?.replace(/"/g, "").trim();
      const status = columns[statusIndex]?.replace(/"/g, "").trim();
      if (url && url.startsWith("http")) {
        records.push({
          url,
          title: title || url,
          tags: tags ? tags.split(",").map((t) => t.trim()) : [],
          timestamp: timestamp ? new Date(+timestamp * 1000) : new Date(),
          status: status ? status.toLowerCase() : "unread"
        });
      }
    }

    return records;
  }

  function parseCSVBySource(csvText: string, source: ImportSource) {
    switch (source) {
      case ImportSource.POCKET:
        return parsePocketCSV(csvText);
      // Example: Add other sources here as needed
      // case ImportSource.CHROME_BOOKMARKS:
      //   return parseChromeBookmarksCSV(csvText);
      // case ImportSource.FIREFOX_BOOKMARKS:
      //   return parseFirefoxBookmarksCSV(csvText);
      // case ImportSource.SAFARI_BOOKMARKS:
      //   return parseSafariBookmarksCSV(csvText);
      default:
        // Fallback to Pocket format for unknown sources
        return parsePocketCSV(csvText);
    }
  }

  async function processZipFile(file: File) {
    try {
      const zip = new JSZip();
      const zipContent = await zip.loadAsync(file);

      const csvFiles: { fileName: string; data: any[] }[] = [];

      // Process each file in the ZIP, looking for CSV files
      for (const [relativePath, zipEntry] of Object.entries(zipContent.files)) {
        if (zipEntry.dir) continue; // Skip directories

        const fileName = zipEntry.name.toLowerCase();

        // Only process CSV files
        if (fileName.endsWith(".csv")) {
          const fileContent = await zipEntry.async("string");
          const records = parseCSVBySource(fileContent, importSource);
          csvFiles.push({ fileName: zipEntry.name, data: records });
        }
      }

      return csvFiles;
    } catch (error) {
      console.error("Error processing ZIP file:", error);
      throw new Error(
        `Failed to process ZIP file: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  async function createNodesFromCsvFiles(
    csvFiles: { fileName: string; data: any[] }[],
    importId: string
  ) {
    let totalCreated = 0;

    // Process all CSV files found in the ZIP
    for (const csvFile of csvFiles) {
      if (Array.isArray(csvFile.data)) {
        totalCreated += await createNodesFromRecords(csvFile.data, importId);
      }
    }

    return totalCreated;
  }

  async function createNodesFromRecords(records: any[], importId: string) {
    const batchSize = 50;
    let totalCreated = 0;

    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      const nodes = batch.map((record) => {
        const sanitized = sanitizeAndResolve(record.url);
        const contentType =
          typeof sanitized === "object"
            ? sanitized.contentType
            : NodeType.WEB_PAGE;
        const url = typeof sanitized === "object" ? sanitized.url : sanitized;

        return {
          contentType,
          url,
          label: record.title,
          body: {
            hash: btoa(record.url),
            description: ""
          },
          importId,
          metadata: {
            originalTags: record.tags,
            originalStatus: record.status,
            originalTimestamp: record.timestamp
          },
          createdAt: record.timestamp,
          parent: undefined,
          text: ""
        };
      });

      try {
        console.log({ nodes });
        // await nodeStore.create(nodes);
        totalCreated += nodes.length;

        if (tempFileList) {
          const progress = Math.min(
            90,
            Math.floor((totalCreated / records.length) * 90)
          );
          tempFileList = tempFileList.map((item) => ({
            ...item,
            uploadProgress: progress
          }));
        }
      } catch (error) {
        console.error("Error creating batch of nodes:", error);
        throw error;
      }
    }

    return totalCreated;
  }

  async function saveImportHistory(importItem: ImportHistoryItem) {
    let imports: ImportHistoryItem[] =
      (preferences.resolve(Preference.IMPORT_HISTORY) as ImportHistoryItem[]) ||
      [];
    if (!Array.isArray(imports)) imports = [];
    imports = imports.filter(
      (item: ImportHistoryItem) =>
        item.id.toString() !== importItem.id.toString()
    );
    imports.push(importItem);
    preferences.save(Preference.IMPORT_HISTORY, imports);
  }

  async function onUpload() {
    if (!tempFileList) {
      toasts.error("Please upload a file");
      return;
    }

    const file = tempFileList[0].file;
    const importId = generateResourceId(Resource.import).toString();

    isUploading = true;
    tempFileList = tempFileList.map((item) => ({
      ...item,
      uploadStatus: UploadStatus.UPLOADING,
      uploadProgress: 10
    }));
    keepIncreasingProgress();

    try {
      let totalCreated = 0;
      let totalRecords = 0;

      if (file.name.toLowerCase().endsWith(".zip")) {
        // Handle ZIP file
        const extractedFiles = await processZipFile(file);
        totalRecords = extractedFiles.reduce(
          (sum, csvFile) => sum + csvFile.data.length,
          0
        );

        const importItem: ImportHistoryItem = {
          id: importId,
          source: importSource,
          fileName: file.name,
          createdAt: new Date().toISOString(),
          totalRecords,
          status: "IN_PROGRESS"
        };

        await saveImportHistory(importItem);
        totalCreated = await createNodesFromCsvFiles(extractedFiles, importId);
      } else {
        throw new Error("Please select a supported file type");
      }

      const importItem: ImportHistoryItem = {
        id: importId,
        source: importSource,
        fileName: file.name,
        createdAt: new Date().toISOString(),
        totalRecords: totalCreated,
        status: "SUCCESS"
      };
      await saveImportHistory(importItem);

      isEverythingUploaded = true;
      toasts.success(
        `Successfully imported ${totalCreated} items from ${getImportSourceName(importSource)} archive`
      );
    } catch (error) {
      console.error("Error during import:", error);
      toasts.error(
        "Failed to import file: " +
          (error instanceof Error ? error.message : String(error))
      );

      const failedImportItem: ImportHistoryItem = {
        id: importId,
        source: importSource,
        fileName: file.name,
        createdAt: new Date().toISOString(),
        totalRecords: 0,
        status: "FAILED"
      };
      await saveImportHistory(failedImportItem);
    } finally {
      isUploading = false;
    }
  }

  function onClose() {
    resetFileInput();
    modalEvent.hide(MemotronAction.IMPORT_FROM_OTHER_APPS);
  }

  function getSizeString(sizeInBytes: number) {
    if (sizeInBytes > 1000000) {
      return `${convertFileSize(sizeInBytes, FileSizeMeasurement.MEGABYTES)}MB`;
    } else if (sizeInBytes > 1000) {
      return `${convertFileSize(sizeInBytes, FileSizeMeasurement.KILOBYTES)}KB`;
    } else {
      return `${sizeInBytes}B`;
    }
  }

  function isFileCountInLimit(files: FileList | null) {
    if (files && files.length > filesLimit) {
      alert(`You can upload maximum ${filesLimit} files at a time`);
      return false;
    }
    return true;
  }

  function isFileValid(file: File) {
    const config = getImportConfig(importSource);

    if (file.size > config.maxFileSize) {
      alert(`File size should be less than ${config.maxSizeText}`);
      return false;
    }

    // Check file type based on import source configuration
    const fileName = file.name.toLowerCase();
    const acceptedTypes = getAcceptedFileTypes(importSource).split(",");
    const isValidType = acceptedTypes.some((type) =>
      fileName.endsWith(type.trim())
    );

    if (!isValidType) {
      alert(`Please select a ${config.fileFormats.join(" or ")} file`);
      return false;
    }

    return true;
  }

  function handleLocallyUploadedFileChange(
    locallyUploadedFiles?: FileList | null
  ) {
    if (locallyUploadedFiles) {
      if (!isFileCountInLimit(locallyUploadedFiles)) {
        tempFileList = null;
      } else {
        for (let i = 0; i < locallyUploadedFiles.length; i++) {
          const file = locallyUploadedFiles[i];
          if (!isFileValid(file)) {
            tempFileList = null;
            break;
          } else {
            tempFileList = Array.from(locallyUploadedFiles).map((file) => {
              return {
                label: file.name,
                size: file.size,
                file: file,
                uploadStatus: UploadStatus.NOT_STARTED,
                uploadProgress: 0
              };
            });
          }
        }
      }
    }
    return tempFileList;
  }

  function handleRemove(index: number) {
    return () => {
      if (tempFileList) {
        tempFileList.splice(index, 1);
        tempFileList = [...tempFileList];
      }
    };
  }

  $: {
    if (tempFileList && tempFileList.length > 0) {
      isEverythingUploaded =
        tempFileList?.every(
          (item) => item.uploadStatus === UploadStatus.UPLOADED
        ) ?? false;
    } else {
      isEverythingUploaded = false;
    }
  }

  $: {
    tempFileList = handleLocallyUploadedFileChange(locallyUploadedFiles);
  }

  function resolveTitle(importSource: ImportSource) {
    return `Import from ${getImportSourceName(importSource)}`;
  }

  function resolveImageSrc(importSource: ImportSource, index: number) {
    return import.meta.env?.VITE_STATIC_URL
      ? import.meta.env?.VITE_STATIC_URL +
          "/memotron/import/" +
          importSource.toLowerCase() +
          "/" +
          index +
          ".png"
      : "/images/blank.png";
  }
</script>

<div class="flex flex-col gap-4 justify-between w-full h-full">
  {#if $view.display === Display.MO}
    <div class="header flex justify-between">
      {#if activeStepIndex !== 0}
        <Icon size={Size.sm} on:click={onBack} icon={"chevleft"} />
      {/if}
      <div class="ml-auto">
        <Button
          size={$view.isPortrait ? Size.sm : Size.md}
          on:click={onClose}
          icon={"cross"}
        />
      </div>
    </div>
  {/if}
  {#if getImportSteps(importSource)[activeStepIndex].type === StepType.NON_INTERACTIVE}
    <div class="flex flex-col items-center gap-2">
      <div class={`font-normal ${$view.isPortrait ? `text-b1` : `text-h4 `}`}>
        {resolveTitle(importSource)}
      </div>
      <div
        class={`font-normal w-full ${$view.isPortrait ? `text-b4` : `text-b3`}`}
      >
        {#key getImportSteps(importSource)[activeStepIndex].subTitle}
          {@html renderMdAsHtml(
            getImportSteps(importSource)[activeStepIndex].subTitle
          )}
        {/key}
      </div>
    </div>
    <div class="flex flex-col items-center gap-2 w-full">
      <div
        class={`text-fgs2 mr-auto dp:mt-4 w-full ${
          $view.isPortrait ? `text-left text-b4` : `text-b2`
        }`}
      >
        {#key getImportSteps(importSource)[activeStepIndex].description}
          {@html renderMdAsHtml(
            getImportSteps(importSource)[activeStepIndex].description
          )}
        {/key}
      </div>
      <div
        class={`rounded-xl overflow-auto object-contain mt-4  flex items-center justify-center mo:w-full w-4/5`}
      >
        <img
          class="w-full"
          alt={`Step-${activeStepIndex + 1}`}
          src={resolveImageSrc(importSource, activeStepIndex)}
        />
      </div>
    </div>
  {:else if getImportSteps(importSource)[activeStepIndex].type === StepType.UPLOAD}
    <div class="flex flex-col items-center gap-2 w-full">
      <div class={`font-normal ${$view.isPortrait ? `text-b1` : `text-h4 `}`}>
        {resolveTitle(importSource)}
      </div>
      <div class={`font-normal ${$view.isPortrait ? `text-b4` : `text-b3`}`}>
        {#key getImportSteps(importSource)[activeStepIndex].subTitle}
          {@html renderMdAsHtml(
            getImportSteps(importSource)[activeStepIndex].subTitle
          )}
        {/key}
      </div>
    </div>
    <div class="flex flex-col items-center gap-2 w-full">
      <div
        class={`text-fgs2 mr-auto ${
          $view.isPortrait
            ? `text-left text-b4`
            : `flex justify-center text-b2 w-full`
        }`}
      >
        {#key getImportSteps(importSource)[activeStepIndex].description}
          {@html renderMdAsHtml(
            getImportSteps(importSource)[activeStepIndex].description
          )}
        {/key}
      </div>
      <div
        class={`rounded-xl border-dashed p-4 overflow-auto mt-4 border  flex items-center justify-center ${
          $view.isPortrait ? `w-full` : `w-[530px]`
        } ${tempFileList?.length ? `border-aps1` : `h-[290px] border-bgs4`}`}
      >
        <div
          class={`flex items-center ${
            tempFileList?.length && !$view.isPortrait
              ? `gap-3`
              : `flex-col gap-2 `
          }`}
        >
          <Icon icon="upload" />
          <div
            class={`flex-col ${
              tempFileList?.length && !$view.isPortrait
                ? `text-left`
                : `text-center`
            }`}
          >
            <div class={`${$view.isPortrait ? `text-b4` : `text-b2`}`}>
              Browse ZIP file or drag and drop here
            </div>
            <div
              class={`text-fgs3 ${tempFileList?.length ? `` : `mb-4`} 
                   ${$view.isPortrait ? `text-b4` : `text-b2`}`}
            >
              {note}
            </div>
          </div>
          <input
            multiple={false}
            bind:files={locallyUploadedFiles}
            class="hidden"
            {accept}
            bind:this={inputRef}
            type="file"
          />
          <Button
            size={Size.sm}
            on:click={() => {
              inputRef.click();
            }}
          >
            Browse ZIP
          </Button>
        </div>
      </div>
    </div>
    {#if tempFileList?.length}
      <div class="flex w-full justify-center">
        <div class="w-4/5 overflow-auto h-60 border rounded-md border-brs2">
          {#each tempFileList as file, index}
            <FileItem
              label={file.label}
              size={getSizeString(file.size)}
              uploadStatus={file.uploadStatus}
              uploadProgress={file.uploadProgress}
              on:remove={handleRemove(index)}
            />
          {/each}
        </div>
      </div>
    {/if}
  {/if}
  {#if !tempFileList?.length}
    <div class="navigation-dots flex gap-3 w-full justify-center">
      {#each getImportSteps(importSource) as step, index}
        <button
          class={`navigation-dot w-2 h-2 rounded-full  ${
            activeStepIndex === index ? "bg-aps1" : "bg-fgs2"
          }`}
          on:click={() => {
            activeStepIndex = index;
          }}
        />
      {/each}
    </div>
  {/if}
  <footer>
    <Divider />
    {#if activeStepIndex === getImportSteps(importSource)?.length - 1 && isEverythingUploaded}
      <div class="p-4">
        Import completed successfully! Your data has been imported and converted
        to web page nodes.
      </div>
    {/if}
    <div class="flex mo:px-3 mo:py-2 p-4">
      {#if $view.isPortrait}
        {#if activeStepIndex !== getImportSteps(importSource)?.length - 1}
          <Button size={Size.sm} on:click={onJumpToUpload}
            >Jump to upload</Button
          >
        {:else}
          <Button size={Size.sm} on:click={onClose}>Cancel</Button>
        {/if}
      {:else if activeStepIndex !== 0}
        <Button size={Size.sm} on:click={onBack}>Back</Button>
      {/if}
      <div class="ml-auto flex gap-3">
        {#if !$view.isPortrait}
          {#if activeStepIndex !== getImportSteps(importSource)?.length - 1}
            <Button size={Size.sm} on:click={onJumpToUpload}
              >Jump to upload</Button
            >
          {:else if activeStepIndex === getImportSteps(importSource)?.length - 1}
            <Button size={Size.sm} on:click={onClose}>Cancel</Button>
          {/if}
        {/if}

        {#if activeStepIndex !== getImportSteps(importSource)?.length - 1}
          <Button
            size={Size.sm}
            on:click={onNext}
            type={ButtonVariant.PRIMARY}
            style={ButtonStyle.OUTLINED}>Next</Button
          >
        {:else if activeStepIndex === getImportSteps(importSource)?.length - 1 && !isEverythingUploaded}
          <Button
            isLoading={isUploading}
            size={Size.sm}
            on:click={onUpload}
            type={ButtonVariant.PRIMARY}>Import</Button
          >
        {:else if activeStepIndex === getImportSteps(importSource)?.length - 1 && isEverythingUploaded}
          <Button size={Size.sm} on:click={onClose}>Done</Button>
        {/if}
      </div>
    </div>
  </footer>
</div>
