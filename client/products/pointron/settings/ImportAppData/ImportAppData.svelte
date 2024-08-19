<script lang="ts">
  import view from "$lib/client/stores/view.store";
  import modalEvent from "$lib/client/components/modal/modal.store";
  import Icon from "$lib/client/elements/Icon.svelte";
  import Button from "$lib/client/elements/button/Button.svelte";
  import { PointronAction } from "$lib/client/types/pointron/pointronAction.enum";
  import { Size } from "$lib/client/types/size.enum";
  import FileItem from "./FileItem.svelte";
  import { UploadStatus } from "$lib/client/types/uploadStatus.enum";
  import { convertFileSize } from "$lib/client/utils/utils";
  import { FileSizeMeasurement } from "$lib/client/types/fileSizeMeasurement.enum";
  import { get } from "svelte/store";
  import account from "$lib/client/stores/account.store";
  import { detectTimeZone } from "$lib/client/utils/time.utils";
  import { toasts } from "$lib/client/stores/notification.store";
  import { lastImportTime } from "../../pointron.store";
  import CheckboxInput from "$lib/client/elements/toggle/CheckboxInput.svelte";
  import { isEmptyArray, isValidArray } from "$lib/shared/utils/obj.utils";
  import { PointronPersistence } from "../../pointron.persistence";
  import { performApiCall } from "$lib/client/utils/network.utils";
  import { ImportSource, StepType } from "../data/data.type";
  import { ButtonStyle, ButtonVariant } from "$lib/client/types/button.type";
  import Divider from "$lib/client/elements/Divider.svelte";
  import { cn } from "$lib/client/utils/ui.utils";
  import { Display } from "$lib/client/types/view.type";
  import { enumToString, properCase } from "$lib/shared/utils/text.utils";
  import InlineMarkdownTextInput from "$lib/client/components/markdown/content/InlineMarkdownTextInput.svelte";

  export let importSource: ImportSource = ImportSource.SELF;
  let checked: boolean = false;
  let inputRef: HTMLInputElement;
  let accept = ".json";
  let note = "File format: JSON, max size: 10MB";
  if (importSource !== ImportSource.SELF) {
    accept = ".csv";
    note = "File format: CSV, max size: 10MB";
  }
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
  const maxFileSize = 10000000;

  let isEverythingUploaded: boolean = false;
  let isUploading: boolean = false;

  const steps: any = {
    [ImportSource.SELF]: [
      {
        subTitle: "Note: Do not exit this modal until the import is complete",
        description: "Browse and choose a exported *Pointron json* file",
        type: StepType.UPLOAD
      }
    ],
    [ImportSource.ATRACKER]: [
      {
        subTitle: "Let us guide you through importing files from ATracker",
        description:
          "Step 1: Go to Reports from the app menu and click on share button on top right corner. Choose email option.",
        type: StepType.NON_INTERACTIVE
      },
      {
        subTitle: "Let us guide you through importing files from ATracker",
        description:
          "Step 2: Once your receive a email with a **csv file** in it, please download the csv file and proceed to the next step.",
        type: StepType.NON_INTERACTIVE
      },
      {
        subTitle:
          "Note: Each task from Atracker will become a goal in Pointron",
        description: "Upload the csv file you downloaded in the previous step.",
        type: StepType.UPLOAD
      }
    ],
    [ImportSource.SESSION]: [
      {
        subTitle: "Let us guide you through importing files from Session",
        description:
          "Step 1: Go to **Reports** from the app menu and click on **share** button.",
        type: StepType.NON_INTERACTIVE
      },
      {
        subTitle: "Let us guide you through importing files from Session",
        description:
          "Step 2: Choose **Export to CSV** option from the share menu. This will export a csv file.",
        type: StepType.NON_INTERACTIVE
      },
      {
        subTitle:
          "**Note:** Each project from Session will become a goal and each task will become a task in Pointron. Also, Session currently does not support bulk export. So, please export the data for each month and then import it individually.",
        description: "Upload the csv file you downloaded in the previous step.",
        type: StepType.UPLOAD
      }
    ],
    [ImportSource.TIMEMATOR]: [
      {
        subTitle: "Let us guide you through importing files from Timemator",
        description: "Step 1: Go to Reports",
        type: StepType.NON_INTERACTIVE
      },
      {
        subTitle: "Let us guide you through importing files from Timemator",
        description: "Step 2: Click on share icon",
        type: StepType.NON_INTERACTIVE
      },
      {
        subTitle: "Let us guide you through importing files from Timemator",
        description: "Step 3: Choose Export as CSV",
        type: StepType.NON_INTERACTIVE
      },
      {
        subTitle:
          "Note: Each folder from Timemator will become a goal and each task  inside a folder will become its sub goal",
        description: "Upload",
        type: StepType.UPLOAD
      }
    ],
    [ImportSource.TOGGL_TRACK]: [
      {
        subTitle: "Let us guide you through importing files from Toggl Track",
        description:
          "Step 1: Select **Import/Export** from the app menu and click on **Data export**.",
        type: StepType.NON_INTERACTIVE
      },
      {
        subTitle: "Let us guide you through importing files from Toggl Track",
        description:
          "Step 3: Click on **Export time entries** after choosing the time period.",
        type: StepType.NON_INTERACTIVE
      },
      {
        subTitle:
          "Note: Each project from Toggl will become a goal and each task will become a task in Pointron",
        description: "Upload the csv file you downloaded in the previous step.",
        type: StepType.UPLOAD
      }
    ]
  };

  function onJumpToUpload() {
    activeStepIndex = steps[importSource]?.length - 1;
  }

  function onNext() {
    if (activeStepIndex < steps[importSource]?.length - 1) {
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

  function getValidFilesFromLocallyUploadedFiles() {
    let validFiles: File[] = [];
    if (tempFileList && locallyUploadedFiles) {
      for (let i = 0; i < locallyUploadedFiles.length; i++) {
        const file = locallyUploadedFiles[i];
        const fileName = file.name;
        if (
          tempFileList.some(
            (item) => item.label === fileName && isFileValid(file)
          )
        ) {
          validFiles.push(file);
        }
      }
    }
    return validFiles;
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
  async function onUpload() {
    if (tempFileList) {
      let response;
      isUploading = true;
      tempFileList = tempFileList.map((item) => {
        return {
          ...item,
          uploadStatus: UploadStatus.UPLOADING,
          uploadProgress: 10
        };
      });
      keepIncreasingProgress();
      if (tempFileList[0].file.type === "application/json") {
        const file = tempFileList[0].file;
        let jsonData;
        let fileName: string;
        let fileSize: number;
        const reader = new FileReader();
        reader.onload = async (event) => {
          try {
            const importedData = event.target?.result;
            if (!importedData) return;
            jsonData = JSON.parse(importedData as string);
            if (isValidImportData(jsonData)) {
              fileName = file.name;
              fileSize = file.size;
            }
            if (!jsonData) toasts.error("Please select a valid file");
            else {
              response = await new PointronPersistence().importData(
                jsonData,
                fileName,
                fileSize
              );
              isEverythingUploaded = true;
              isUploading = false;
              $lastImportTime = Date.now();
            }
          } catch (error) {
            console.error("Error parsing JSON file:", error);
            toasts.error("Invalid file selected");
          }
        };
        reader.readAsText(file);
      } else {
        try {
          const userId = get(account)?.userInfo?.id.split(":")[1] ?? "";
          const [url, customName, itemLocalURL] = await account.tempUploadToS3(
            tempFileList[0].file
          );
          const timeZone = detectTimeZone();
          const region = $account.userInfo?.region;
          let body = {
            s3Url: url,
            userId: userId,
            timeZone: timeZone,
            region: region,
            isArchiveAll: checked
          };
          isEverythingUploaded = true;
          isUploading = false;
          setTimeout(() => {
            $lastImportTime = Date.now();
          }, 5000);
          // let jsonBody = JSON.stringify(body);
          response = await performApiCall("pointron/import", "POST", body);
          console.log({ response });
          // response = await fetch("http://127.0.0.1:5000/upload", {
          //   method: "POST",
          //   headers: {
          //     "Content-Type": "application/json"
          //   },
          //   body: jsonBody
          // });
        } catch (e: any) {
          toasts.error("Something went wrong during Import", e);
        }
      }

      // onClose();
    } else {
      alert("Please upload a file");
    }
  }

  function onClose() {
    resetFileInput();
    modalEvent.hide(PointronAction.IMPORT_APP_DATA);
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
    if (file.size > maxFileSize) {
      alert("File size should be less than 10MB");
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
    if (importSource === ImportSource.SELF) return "Import from Pointron";
    else {
      return `Import from ${properCase(enumToString(importSource))} App`;
    }
  }

  function resolveImageSrc(importSource: ImportSource, index: number) {
    if (importSource === ImportSource.SELF) return "/images/blank.png";
    else {
      return import.meta.env?.VITE_STATIC_URL
        ? import.meta.env?.VITE_STATIC_URL +
            "/pointron/import/" +
            importSource.toLowerCase() +
            "/" +
            index +
            ".png"
        : "/images/blank.png";
    }
  }
</script>

<div class="flex flex-col gap-4 justify-between w-full h-full">
  <div>
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
    <div
      class={`steps-container flex flex-col gap-6 items-center justify-center`}
    >
      {#if steps[importSource][activeStepIndex].type === StepType.NON_INTERACTIVE}
        <div class="flex flex-col items-center text-fgs1 gap-2">
          <div
            class={`font-normal ${$view.isPortrait ? `text-b1` : `text-h4 `}`}
          >
            {resolveTitle(importSource)}
          </div>
          <div
            class={`font-normal ${$view.isPortrait ? `text-b4` : `text-b3`}`}
          >
            {#key steps[importSource][activeStepIndex].subTitle}
              <InlineMarkdownTextInput
                content={steps[importSource][activeStepIndex].subTitle}
              />
            {/key}
          </div>
          <div
            class={`text-fgs2 mr-auto ${
              $view.isPortrait ? `text-left text-b4` : `text-b2`
            }`}
          >
            {#key steps[importSource][activeStepIndex].description}
              <InlineMarkdownTextInput
                content={steps[importSource][activeStepIndex].description}
              />
            {/key}
          </div>
          <div
            class={`rounded-xl overflow-auto object-contain mt-4  flex items-center justify-center ${
              $view.isPortrait ? `w-full` : `w-[530px]`
            }`}
          >
            <img
              class="w-full"
              alt={`Step-${activeStepIndex + 1}`}
              src={resolveImageSrc(importSource, activeStepIndex)}
            />
          </div>
        </div>
      {:else if steps[importSource][activeStepIndex].type === StepType.UPLOAD}
        <div class="flex flex-col items-center text-fgs1 gap-2">
          <div
            class={`font-normal ${$view.isPortrait ? `text-b1` : `text-h4 `}`}
          >
            {resolveTitle(importSource)}
          </div>
          <div
            class={`font-normal ${$view.isPortrait ? `text-b4` : `text-b3`}`}
          >
            {#key steps[importSource][activeStepIndex].subTitle}
              <InlineMarkdownTextInput
                class="text-center"
                content={steps[importSource][activeStepIndex].subTitle}
              />
            {/key}
          </div>
          <div
            class={`text-fgs2 mr-auto ${
              $view.isPortrait
                ? `text-left text-b4`
                : `flex justify-center text-b2 w-full`
            }`}
          >
            {#key steps[importSource][activeStepIndex].description}
              <InlineMarkdownTextInput
                class="text-center"
                content={steps[importSource][activeStepIndex].description}
              />
            {/key}
          </div>
          <div
            class={`rounded-xl border-dashed p-4 overflow-auto mt-4 border  flex items-center justify-center ${
              $view.isPortrait ? `w-full` : `w-[530px]`
            } ${tempFileList?.length ? `border-a1` : `h-[290px] border-bgs4`}`}
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
                  Browse a file or drag and drop here
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
                Browse
              </Button>
            </div>
          </div>
          {#if tempFileList?.length}
            <div
              class={`w-full  overflow-auto ${
                $view.isPortrait ? `h-[11.5rem]` : `h-[15rem]`
              }`}
            >
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
          {/if}
          <!-- {/if} -->
        </div>
      {/if}
      {#if !tempFileList?.length}
        <div class="navigation-dots flex gap-3">
          {#each steps[importSource] as step, index}
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
    </div>
  </div>
  <footer>
    <Divider />
    {#if activeStepIndex === steps[importSource]?.length - 1 && isEverythingUploaded}
      <div class="p-4">
        Upload completed successfully, Importing in background, Check the import
        table after a few minutes for status
      </div>
    {/if}
    {#if importSource != ImportSource.SELF && activeStepIndex === steps[importSource]?.length - 1 && !isEverythingUploaded}
      <div class="p-4">
        <CheckboxInput bind:checked label="Archive All Imported Goals" />
      </div>
    {/if}
    <div class="flex mo:px-3 mo:py-2 p-4">
      {#if $view.isPortrait}
        {#if activeStepIndex !== steps[importSource]?.length - 1}
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
          {#if activeStepIndex !== steps[importSource]?.length - 1}
            <Button size={Size.sm} on:click={onJumpToUpload}
              >Jump to upload</Button
            >
          {:else if activeStepIndex === steps[importSource]?.length - 1}
            <Button size={Size.sm} on:click={onClose}>Cancel</Button>
          {/if}
        {/if}

        {#if activeStepIndex !== steps[importSource]?.length - 1}
          <Button
            size={Size.sm}
            on:click={onNext}
            type={ButtonVariant.PRIMARY}
            style={ButtonStyle.OUTLINED}>Next</Button
          >
        {:else if activeStepIndex === steps[importSource]?.length - 1 && !isEverythingUploaded}
          <Button
            isLoading={isUploading}
            size={Size.sm}
            on:click={onUpload}
            type={ButtonVariant.PRIMARY}>Import</Button
          >
        {:else if activeStepIndex === steps[importSource]?.length - 1 && isEverythingUploaded}
          <Button size={Size.sm} on:click={onClose}>Done</Button>
        {/if}
      </div>
    </div>
  </footer>
</div>
