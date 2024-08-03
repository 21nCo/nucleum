<script lang="ts">
  import { page } from "$app/stores";
  import { OtherApps } from "$lib/client/types/pointron/otherApps.enum";
  import view from "$lib/client/stores/view.store";
  import modalEvent from "$lib/client/components/modal/modal.store";
  import { StepType } from "$lib/client/types/pointron/stepType.enum";
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
  import { tempUploadToS3 } from "$lib/client/utils/storage.utils";
  import { detectTimeZone } from "$lib/client/utils/time.utils";
  import { toasts } from "$lib/client/stores/notification.store";
  import { lastImportTime } from "../../pointron.store";
  import CheckboxInput from "$lib/client/elements/toggle/CheckboxInput.svelte";
  import { isEmptyArray, isValidArray } from "$lib/shared/utils/obj.utils";
  import { PointronPersistence } from "../../pointron.persistence";

  export let id: OtherApps | "POINTRON" = "POINTRON";
  let checked: boolean = false;
  let inputRef: HTMLInputElement;
  let accept = ".json";
  let note = "File format: JSON, max size: 10MB";
  if (id !== "POINTRON") {
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
    ["POINTRON"]: [
      {
        title: "Import from Pointron",
        subTitle:
          "Disclaimer: Do not exit this modal until the import is complete",
        description: "Browse and choose a exported json file",
        type: StepType.UPLOAD
      }
    ],
    [OtherApps.ATRACKER]: [
      {
        title: "Import from Atracker",
        subTitle: "Let Us Guide You Through Importing Files from ATracker",
        description: "Step-1: Go to Reports",
        image: {
          portrait: "/images/import/importPortraitStep1.png",
          landscape: "/images/import/importLandscapeStep1.png"
        },
        type: StepType.NON_INTERACTIVE
      },
      {
        title: "Import from Atracker",
        subTitle: "Let Us Guide You Through Importing Files from ATracker",
        description:
          "Step-2: Click on share button and choose email (this will export a csv file)",
        image: {
          portrait: "/images/import/importPortraitStep1.png",
          landscape: "/images/import/importLandscapeStep1.png"
        },
        type: StepType.NON_INTERACTIVE
      },
      {
        title: "Import from Atracker",
        subTitle:
          "Disclaimer: Each task from Atracker will become a goal in Pointron",
        description: "Step-3: Upload screen",
        type: StepType.UPLOAD
      }
    ],
    // [OtherApps.CSV]: [
    // {
    //   title: "Import from CSV",
    //   subTitle: "Let Us Guide You Through Importing Files from CSV",
    //   description: "Step-1: Go to Reports",
    //   image: {
    //     portrait: "/images/import/importPortraitStep1.png",
    //     landscape: "/images/import/importLandscapeStep1.png",
    //   },
    //   type: StepType.NON_INTERACTIVE,
    // },
    // {
    //   title: "Import from CSV",
    //   subTitle: "Let Us Guide You Through Importing Files from CSV",
    //   description:
    //     "Step-2: Click on share button and choose email (this will export a csv file)",
    //   image: {
    //     portrait: "/images/import/importPortraitStep1.png",
    //     landscape: "/images/import/importLandscapeStep1.png",
    //   },
    //   type: StepType.NON_INTERACTIVE,
    // },
    // {
    //   title: "Import from CSV",
    //   subTitle:
    //     "Disclaimer: Each row from CSV will become a goal in Pointron",
    //   description: "Upload screen",
    //   type: StepType.UPLOAD
    // }
    // ],
    [OtherApps.SESSION]: [
      {
        title: "Import from Session",
        subTitle: "Let Us Guide You Through Importing Files from Session",
        description: "Step-1: Go to Reports",
        image: {
          portrait: "/images/import/importPortraitStep1.png",
          landscape: "/images/import/importLandscapeStep1.png"
        },
        type: StepType.NON_INTERACTIVE
      },
      {
        title: "Import from Session",
        subTitle: "Let Us Guide You Through Importing Files from Session",
        description: "Step-2: Click on the share button",
        image: {
          portrait: "/images/import/importPortraitStep1.png",
          landscape: "/images/import/importLandscapeStep1.png"
        },
        type: StepType.NON_INTERACTIVE
      },
      {
        title: "Import from Session",
        subTitle: "Let Us Guide You Through Importing Files from Session",
        description: "Step-3: Choose Export to CSV option",
        image: {
          portrait: "/images/import/importPortraitStep1.png",
          landscape: "/images/import/importLandscapeStep1.png"
        },
        type: StepType.NON_INTERACTIVE
      },
      {
        title: "Import from Session",
        subTitle:
          "Disclaimer: Each project from Session will become a goal and each task will become a task in Pointron",
        description: "Step-4: Import - upload screen",
        type: StepType.UPLOAD
      }
    ],
    [OtherApps.TIMEMATOR]: [
      {
        title: "Import from Timemator",
        subTitle: "Let Us Guide You Through Importing Files from Timemator",
        description: "Step-1: Go to Reports",
        image: {
          portrait: "/images/import/importPortraitStep1.png",
          landscape: "/images/import/importLandscapeStep1.png"
        },
        type: StepType.NON_INTERACTIVE
      },
      {
        title: "Import from Timemator",
        subTitle: "Let Us Guide You Through Importing Files from Timemator",
        description: "Step-2: Click on share icon",
        image: {
          portrait: "/images/import/importPortraitStep1.png",
          landscape: "/images/import/importLandscapeStep1.png"
        },
        type: StepType.NON_INTERACTIVE
      },
      {
        title: "Import from Timemator",
        subTitle: "Let Us Guide You Through Importing Files from Timemator",
        description: "Step-3: Choose Export as CSV",
        image: {
          portrait: "/images/import/importPortraitStep1.png",
          landscape: "/images/import/importLandscapeStep1.png"
        },
        type: StepType.NON_INTERACTIVE
      },
      {
        title: "Import from Timemator",
        subTitle:
          "Disclaimer: Each folder from Timemator will become a goal and each task  inside a folder will become its sub goal",
        description: "Step-4: Upload screen",
        type: StepType.UPLOAD
      }
    ],
    [OtherApps.TOGGL_TRACK]: [
      {
        title: "Import from Toggl Track",
        subTitle: "Let Us Guide You Through Importing Files from Toggl Track",
        description: "Step-1: Go to Import/Export menu",
        image: {
          portrait: "/images/import/importPortraitStep1.png",
          landscape: "/images/import/importLandscapeStep1.png"
        },
        type: StepType.NON_INTERACTIVE
      },
      {
        title: "Import from Toggl Track",
        subTitle: "Let Us Guide You Through Importing Files from Toggl Track",
        description: "Step-2: Click on data export",
        image: {
          portrait: "/images/import/importPortraitStep1.png",
          landscape: "/images/import/importLandscapeStep1.png"
        },
        type: StepType.NON_INTERACTIVE
      },
      {
        title: "Import from Toggl Track",
        subTitle: "Let Us Guide You Through Importing Files from Toggl Track",
        description:
          "Step-3: Click on  Export time entries after choosing the time period",
        image: {
          portrait: "/images/import/importPortraitStep1.png",
          landscape: "/images/import/importLandscapeStep1.png"
        },
        type: StepType.NON_INTERACTIVE
      },
      {
        title: "Import from Toggl Track",
        subTitle:
          "Disclaimer: Each project from Toggl will become a goal and each task will become a task in Pointron",
        description: "Step-4: Upload screen",
        type: StepType.UPLOAD
      }
    ]
  };

  function onJumpToUpload() {
    activeStepIndex = steps[id]?.length - 1;
  }

  function onNext() {
    if (activeStepIndex < steps[id]?.length - 1) {
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
          const [url, customName, itemLocalURL] = await tempUploadToS3(
            tempFileList[0].file
          );
          const timeZone = detectTimeZone();
          let body = {
            s3Url: url,
            userId: userId,
            timeZone: timeZone,
            isArchiveAll: checked
          };
          isEverythingUploaded = true;
          isUploading = false;
          setTimeout(() => {
            $lastImportTime = Date.now();
          }, 5000);
          let jsonBody = JSON.stringify(body);
          response = await fetch("http://127.0.0.1:5000/upload", {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: jsonBody
          });
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
    modalEvent.hideSpecific(PointronAction.IMPORT_APP_DATA);
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
</script>

<div class={`flex flex-col w-full`}>
  <div class={` ${$view.isPortrait ? `p-4` : `p-8`}`}>
    <div class="header flex justify-between">
      {#if $view.isPortrait && activeStepIndex !== 0}
        <Icon size={Size.sm} on:click={onBack} icon={"chevleft"} />
      {/if}
      <div class="ml-auto">
        <Icon
          size={$view.isPortrait ? Size.sm : Size.md}
          on:click={onClose}
          icon={"cross"}
        />
      </div>
    </div>
    <div
      class={`steps-container flex flex-col gap-6 items-center justify-center`}
    >
      {#if steps[id][activeStepIndex].type === StepType.NON_INTERACTIVE}
        <div class="flex flex-col items-center text-fgs1 gap-2">
          <div
            class={`font-normal ${$view.isPortrait ? `text-b1` : `text-h4 `}`}
          >
            {steps[id][activeStepIndex].title}
          </div>
          <div
            class={`font-normal ${$view.isPortrait ? `text-b4` : `text-b3`}`}
          >
            {steps[id][activeStepIndex].subTitle}
          </div>
          <div
            class={`text-fgs2 mr-auto mt-8 ${
              $view.isPortrait ? `text-left text-b4` : `text-b2`
            }`}
          >
            {steps[id][activeStepIndex].description}
          </div>
          {#if $view.isPortrait ? steps[id][activeStepIndex]?.image?.portrait : steps[id][activeStepIndex]?.image?.landscape}
            <div
              class={`rounded-xl overflow-auto object-contain mt-4  flex items-center justify-center ${
                $view.isPortrait ? `w-full` : `w-[530px]`
              }`}
            >
              <img
                class="w-full"
                alt={`Step-${activeStepIndex + 1}`}
                src={$view.isPortrait
                  ? steps[id][activeStepIndex]?.image?.portrait
                  : steps[id][activeStepIndex]?.image?.landscape}
              />
            </div>
          {/if}
        </div>
      {:else if steps[id][activeStepIndex].type === StepType.UPLOAD}
        <div class="flex flex-col items-center text-fgs1 gap-2">
          <div
            class={`font-normal ${$view.isPortrait ? `text-b1` : `text-h4 `}`}
          >
            {steps[id][activeStepIndex].title}
          </div>
          <div
            class={`font-normal ${$view.isPortrait ? `text-b4` : `text-b3`}`}
          >
            {steps[id][activeStepIndex].subTitle}
          </div>
          <div
            class={`text-fgs2 mr-auto mt-8 ${
              $view.isPortrait ? `text-b4` : `text-b2`
            }`}
          >
            {steps[id][activeStepIndex].description}
          </div>
          <!-- {#if steps[id][activeStepIndex].image} -->
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
          {#each steps[id] as step, index}
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
  <div class="bg-bgs2 w-full h-[1px]" />
  {#if activeStepIndex === steps[id]?.length - 1 && isEverythingUploaded}
    <div class="p-4">
      Upload completed successfully, Importing in background, Check the import
      table after a few minutes for status
    </div>
  {/if}
  {#if id != "POINTRON" && activeStepIndex === steps[id]?.length - 1 && !isEverythingUploaded}
    <div class="p-4">
      <CheckboxInput bind:checked label="Archive All Imported Goals" />
    </div>
  {/if}
  <div
    class={`footer-buttons flex ${
      $view.isPortrait ? `px-4 py-2.5` : `px-10 py-5`
    }`}
  >
    {#if $view.isPortrait}
      {#if activeStepIndex !== steps[id]?.length - 1}
        <Button size={Size.sm} on:click={onJumpToUpload}>Jump to upload</Button>
      {:else}
        <Button size={Size.sm} on:click={onClose}>Cancel</Button>
      {/if}
    {:else if activeStepIndex !== steps[id]?.length - 1}
      <Button size={Size.sm} on:click={onJumpToUpload}>Jump to upload</Button>
    {:else}
      <Button size={Size.sm} on:click={onBack}>Back</Button>
    {/if}
    <div class="ml-auto flex gap-3">
      {#if !$view.isPortrait}
        {#if activeStepIndex !== 0 && activeStepIndex !== steps[id]?.length - 1}
          <Button size={Size.sm} on:click={onBack}>Back</Button>
        {:else if activeStepIndex === steps[id]?.length - 1}
          <Button size={Size.sm} on:click={onClose}>Cancel</Button>
        {/if}
      {/if}

      {#if activeStepIndex !== steps[id]?.length - 1}
        <Button size={Size.sm} on:click={onNext}>Next</Button>
      {:else if activeStepIndex === steps[id]?.length - 1 && !isEverythingUploaded}
        <Button isLoading={isUploading} size={Size.sm} on:click={onUpload}
          >Upload</Button
        >
      {:else if activeStepIndex === steps[id]?.length - 1 && isEverythingUploaded}
        <Button size={Size.sm} on:click={onClose}>Done</Button>
      {/if}
    </div>
  </div>
</div>
