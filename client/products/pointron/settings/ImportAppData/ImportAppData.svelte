<script lang="ts">
  import { page } from "$app/stores";
  import { OtherApps } from "$lib/client/types/pointron/otherApps.enum";
  import { onMount } from "svelte";
  import view from "$lib/client/stores/view.store";
  import modalEvent from "$lib/client/components/modal/modal.store";
  import { StepType } from "$lib/client/types/pointron/stepType.enum";
  import Icon from "$lib/client/elements/Icon.svelte";
  import Chevron from "$lib/client/icons/Chevron.svelte";
  import DropdownArrow from "$lib/client/icons/DropdownArrow.svelte";
  import Button from "$lib/client/elements/button/Button.svelte";
  import { ButtonStyle } from "$lib/client/types/button.type";
  import { PointronEventEnum } from "$lib/client/types/pointron/pointronEvent.enum";
  import { Size } from "$lib/client/types/size.enum";
  import FileItem from "./FileItem.svelte";
  import { UploadStatus } from "$lib/client/types/uploadStatus.enum";
  import { convertFileSize } from "$lib/client/utils/utils";
  import { FileSizeMeasurement } from "$lib/client/types/fileSizeMeasurement.enum";

  export let id: OtherApps = OtherApps.ATRACKER;

  let inputRef: HTMLInputElement;

  let activeStepIndex: number = 0;

  let locallyUploadedFiles: FileList | null = null;

  let tempFileList:
    | {
        label: string;
        size: number;
        uploadStatus: UploadStatus;
        uploadProgress: number;
      }[]
    | null = null;

  const filesLimit = 5;
  const maxFileSize = 10000000;

  let isEverythingUploaded: boolean = false;
  let isUploading: boolean = false;

  const steps: any = {
    [OtherApps.ATRACKER]: [
      {
        title: "Import from Atracker",
        subTitle: "Let Us Guide You Through Importing Files from ATracker",
        description: "Step-1: Go to Reports",
        image: {
          portrait: "/images/import/portraitStep1.png",
          landscape: "/images/import/landscapeStep1.png"
        },
        type: StepType.NON_INTERACTIVE
      },
      {
        title: "Import from Atracker",
        subTitle: "Let Us Guide You Through Importing Files from ATracker",
        description:
          "Step-2: Click on share button and choose email (this will export a csv file)",
        image: {
          portrait: "/images/import/portraitStep1.png",
          landscape: "/images/import/landscapeStep1.png"
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
    [OtherApps.CSV]: [
      // {
      //   title: "Import from CSV",
      //   subTitle: "Let Us Guide You Through Importing Files from CSV",
      //   description: "Step-1: Go to Reports",
      //   image: {
      //     portrait: "/images/import/portraitStep1.png",
      //     landscape: "/images/import/landscapeStep1.png",
      //   },
      //   type: StepType.NON_INTERACTIVE,
      // },
      // {
      //   title: "Import from CSV",
      //   subTitle: "Let Us Guide You Through Importing Files from CSV",
      //   description:
      //     "Step-2: Click on share button and choose email (this will export a csv file)",
      //   image: {
      //     portrait: "/images/import/portraitStep1.png",
      //     landscape: "/images/import/landscapeStep1.png",
      //   },
      //   type: StepType.NON_INTERACTIVE,
      // },
      {
        title: "Import from CSV",
        subTitle:
          "Disclaimer: Each row from CSV will become a goal in Pointron",
        description: "Upload screen",
        type: StepType.UPLOAD
      }
    ],
    [OtherApps.SESSION]: [
      {
        title: "Import from Session",
        subTitle: "Let Us Guide You Through Importing Files from Session",
        description: "Step-1: Go to Reports",
        image: {
          portrait: "/images/import/portraitStep1.png",
          landscape: "/images/import/landscapeStep1.png"
        },
        type: StepType.NON_INTERACTIVE
      },
      {
        title: "Import from Session",
        subTitle: "Let Us Guide You Through Importing Files from Session",
        description: "Step-2: Click on the share button",
        image: {
          portrait: "/images/import/portraitStep1.png",
          landscape: "/images/import/landscapeStep1.png"
        },
        type: StepType.NON_INTERACTIVE
      },
      {
        title: "Import from Session",
        subTitle: "Let Us Guide You Through Importing Files from Session",
        description: "Step-3: Choose Export to CSV option",
        image: {
          portrait: "/images/import/portraitStep1.png",
          landscape: "/images/import/landscapeStep1.png"
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
          portrait: "/images/import/portraitStep1.png",
          landscape: "/images/import/landscapeStep1.png"
        },
        type: StepType.NON_INTERACTIVE
      },
      {
        title: "Import from Timemator",
        subTitle: "Let Us Guide You Through Importing Files from Timemator",
        description: "Step-2: Click on share icon",
        image: {
          portrait: "/images/import/portraitStep1.png",
          landscape: "/images/import/landscapeStep1.png"
        },
        type: StepType.NON_INTERACTIVE
      },
      {
        title: "Import from Timemator",
        subTitle: "Let Us Guide You Through Importing Files from Timemator",
        description: "Step-3: Choose Export as CSV",
        image: {
          portrait: "/images/import/portraitStep1.png",
          landscape: "/images/import/landscapeStep1.png"
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
          portrait: "/images/import/portraitStep1.png",
          landscape: "/images/import/landscapeStep1.png"
        },
        type: StepType.NON_INTERACTIVE
      },
      {
        title: "Import from Toggl Track",
        subTitle: "Let Us Guide You Through Importing Files from Toggl Track",
        description: "Step-2: Click on data export",
        image: {
          portrait: "/images/import/portraitStep1.png",
          landscape: "/images/import/landscapeStep1.png"
        },
        type: StepType.NON_INTERACTIVE
      },
      {
        title: "Import from Toggl Track",
        subTitle: "Let Us Guide You Through Importing Files from Toggl Track",
        description:
          "Step-3: Click on  Export time entries after choosing the time period",
        image: {
          portrait: "/images/import/portraitStep1.png",
          landscape: "/images/import/landscapeStep1.png"
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
  function onUpload() {
    if (tempFileList) {
      const validFiles = getValidFilesFromLocallyUploadedFiles();
      isUploading = true;
      tempFileList = tempFileList.map((item) => {
        return {
          ...item,
          uploadStatus: UploadStatus.UPLOADING,
          uploadProgress: 0
        };
      });
      //upload these files to the server, and take updates from the stream regarding the uploadProgress, and uploadStatus, after success, update the uploadStatus to UPLOADED, and uploadProgress to 100, isUploading to false

      //also update the progress at a frequency here, along with the uploadStatus

      // onClose();
    } else {
      alert("Please upload a file");
    }
  }

  function onClose() {
    resetFileInput();
    modalEvent.hideSpecific(PointronEventEnum.IMPORT_APP_DATA);
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

<div
  class={`flex flex-col ${$view.isPortrait ? `w-full` : `lg:min-w-[1000px]`}`}
>
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
                  File format: CSV, max size: 10MB, limited to 5 files
                </div>
              </div>
              <input
                multiple
                bind:files={locallyUploadedFiles}
                class="hidden"
                accept=".csv"
                bind:this={inputRef}
                type="file"
              />
              <Button
                size={Size.sm}
                on:click={() => {
                  inputRef.click();
                }}
                type="tertiary"
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
  <div
    class={`footer-buttons flex ${
      $view.isPortrait ? `px-4 py-2.5` : `px-10 py-5`
    }`}
  >
    {#if $view.isPortrait}
      {#if activeStepIndex !== steps[id]?.length - 1}
        <Button size={Size.sm} on:click={onJumpToUpload} type="tertiary">
          Jump to upload
        </Button>
      {:else}
        <Button size={Size.sm} on:click={onClose} type="tertiary">Cancel</Button
        >
      {/if}
    {:else if activeStepIndex !== steps[id]?.length - 1}
      <Button size={Size.sm} on:click={onJumpToUpload} type="tertiary"
        >Jump to upload</Button
      >
    {:else}
      <Button size={Size.sm} on:click={onBack} type="tertiary">Back</Button>
    {/if}
    <div class="ml-auto flex gap-3">
      {#if !$view.isPortrait}
        {#if activeStepIndex !== 0 && activeStepIndex !== steps[id]?.length - 1}
          <Button size={Size.sm} on:click={onBack} type="tertiary">Back</Button>
        {:else if activeStepIndex === steps[id]?.length - 1}
          <Button size={Size.sm} on:click={onClose} type="tertiary"
            >Cancel</Button
          >
        {/if}
      {/if}

      {#if activeStepIndex !== steps[id]?.length - 1}
        <Button size={Size.sm} on:click={onNext} type="tertiary">Next</Button>
      {:else if activeStepIndex === steps[id]?.length - 1 && !isEverythingUploaded}
        <Button
          isLoading={isUploading}
          size={Size.sm}
          on:click={onUpload}
          type="tertiary">Upload</Button
        >
      {:else if activeStepIndex === steps[id]?.length - 1 && isEverythingUploaded}
        <Button size={Size.sm} on:click={onClose} type="tertiary">Done</Button>
      {/if}
    </div>
  </div>
</div>
