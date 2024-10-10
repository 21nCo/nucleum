<svelte:options accessors={true} />

<script lang="ts">
  import type { IMediaGridItem } from "$lib/client/products/memotron/node/node.type";
  import { dragAndDropStore } from "$lib/client/stores/app.store";
  import view from "$lib/client/stores/view.store";
  import { DragStatus } from "$lib/client/types/dragstatus.enum";
  import { onMount } from "svelte";
  import type { IFile } from "../../files/file.type";
  import type { IRecordId } from "$lib/client/types/data.type";
  import { fileStore } from "../../files/file.store";
  import FileView from "../../files/FileView.svelte";
  import { cn } from "$lib/client/utils/ui.utils";

  export let isGridItem: boolean = true;
  export let item: IMediaGridItem;
  export let file: IFile | null = null;
  export let isDraggable: boolean = false;
  export let isDragging: boolean = false;
  export let id: any;
  export let ref: any = null;
  export let sizeProperty: "width" | "height" = "height";
  export let gap: number = 8;
  export let handleFileUpload: (
    param1: any,
    param2: any,
    param3: any,
    param4: any
  ) => void;
  let _file: IFile | null = null;

  let classList: string = `{isDraggable
      ? 'cursor-move'
      : ''}  box-border inline-block border-[2.5px] border-transparent`;
  let style = `${sizeProperty}: 100%;
object-fit: scale-down;
cursor: pointer;${sizeProperty == "height" ? `margin:${gap / 2}px;` : ""}`;
  $: style = `${sizeProperty}: 100%;
object-fit: scale-down;
cursor: pointer;${sizeProperty == "height" ? `margin:${gap / 2}px;` : ""}`;
  let isDragOver = false;
  let highlightBorder = "left";
  let dragId: any;
  let dragEnterId: any;
  let dropId: any;
  $: dragId = dragEnterId = dropId = id;

  onMount(async () => {
    if (!_file && file) _file = file;
    else if (item.file) await resolveFile(item.file);
  });

  async function resolveFile(fileId: IRecordId) {
    const response = await fileStore.select(fileId);
    if (response?.url) _file = response;
  }

  function removeBorders(element: HTMLElement) {
    element.classList.remove(`${highlightBorder}Throbbing`);
  }
  const handleDragStart = (e: any) => {
    e.stopPropagation();
    isDragging = true;
    dragAndDropStore.update((x: any) => {
      x = { ...x, dragStatus: DragStatus.STARTED, dragItem: item, dragId };
      return x;
    });
  };
  const handleDragEnter = async (e: any) => {
    e.stopPropagation();
    isDragOver = true;
    dragAndDropStore.update((x: any) => {
      x = {
        ...x,
        dragStatus: DragStatus.DRAGGING,
        dragEnterItem: item,
        dragEnterId
      };
      return x;
    });
    if (!isGridItem) return;
    function isInView(element: any) {
      const parentBoundingBox = element.parentElement.getBoundingClientRect();
      const boundingBox = element.getBoundingClientRect();
      return (
        boundingBox.top >= 0 && boundingBox.bottom <= parentBoundingBox.bottom
      );
    }
    let isInV = isInView(ref);
    if ($view.isPortrait || !isInV) {
      await ref.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };
  const handleDragEnd = (e: any) => {
    e.stopPropagation();
    isDragging = false;
  };
  /**
   * dt.files[0] is true when drag & drop from system files
   * @param e
   */
  const handleDrop = (e: any) => {
    e.stopPropagation();
    isDragOver = false;
    isDragging = false;
    const element = e.target;
    removeBorders(element);
    let dt = e?.dataTransfer;
    if (dt?.files[0]) {
      handleFileUpload(
        e,
        highlightBorder == "right" || highlightBorder == "bottom"
          ? item.position.auto + 1
          : item.position.auto,
        item.position.columns.columnNo,
        highlightBorder == "bottom"
          ? item.position.columns.index + 1
          : item.position.columns.index
      );
    } else {
      dragAndDropStore.update((x: any) => {
        x = {
          ...x,
          dragStatus: DragStatus.DROPPED,
          dropItem: item,
          dropId,
          forwardDrop:
            highlightBorder == "right" || highlightBorder == "bottom"
              ? true
              : false
        };
        return x;
      });
    }
  };
  function onDragOver(e: any) {
    e?.stopPropagation();
    e?.preventDefault();
    if (!isGridItem) return;
    const rect = e.target.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const width = e.target.offsetWidth;
    const height = e.target.offsetHeight;
    const element = e.target;
    removeBorders(element);
    if (sizeProperty == "width") {
      if (y <= height / 2) {
        highlightBorder = "top";
      } else {
        highlightBorder = "bottom";
      }
    } else {
      if (x <= width / 2) {
        highlightBorder = "left";
      } else {
        highlightBorder = "right";
      }
    }
    element.classList.add(`${highlightBorder}Throbbing`);
  }
  function handleDragLeave(e: any) {
    e.stopPropagation();
    isDragOver = false;
    const element = e.target;
    removeBorders(element);
    dragAndDropStore.update((x: any) => {
      x = { ...x, dragLeaveItem: item };
      return x;
    });
  }
  function draggable(node: HTMLElement) {
    node.addEventListener("dragstart", handleDragStart);
    node.addEventListener("dragend", handleDragEnd);
    node.addEventListener("dragover", onDragOver);
    node.addEventListener("dragenter", handleDragEnter);
    node.addEventListener("dragleave", handleDragLeave);
    node.addEventListener("drop", handleDrop);

    return {
      destroy() {
        node.removeEventListener("dragstart", handleDragStart);
        node.removeEventListener("dragend", handleDragEnd);
        node.removeEventListener("dragover", onDragOver);
        node.removeEventListener("dragenter", handleDragEnter);
        node.removeEventListener("dragleave", handleDragLeave);
        node.removeEventListener("drop", handleDrop);
      }
    };
  }
</script>

{#if _file}
  <FileView
    file={_file}
    class={classList}
    {style}
    {isDraggable}
    on:load
    on:dragstart={handleDragStart}
    on:dragend={handleDragEnd}
    on:dragover={onDragOver}
    on:dragenter={handleDragEnter}
    on:dragleave={handleDragLeave}
    on:drop={handleDrop}
    bind:ref
  />
{:else if id.includes("DropArea")}
  <div
    draggable={false}
    use:draggable
    class={cn(
      "absolute w-full h-full bg-opacity-50 rounded-md flex items-center justify-center text-b2 text-fgs2",
      {
        "bg-bgs3": isDragOver,
        "bg-bgs2": !isDragOver
      }
    )}
  >
    Column: {item.position.columns.columnNo + 1}
  </div>
{/if}
<!-- {#if file?.type.startsWith("image/")}
  <img
    alt="..."
    class={classList}
    on:load
    src={file.url}
    {style}
    draggable={isDraggable}
    use:draggable
    bind:this={ref}
  />
{:else if file?.type.startsWith("video/")}
  <video
    controls
    class={classList}
    {style}
    draggable={isDraggable}
    use:draggable
    bind:this={ref}
  >
    <source src={file.url} />
    <track kind="captions" />
  </video>
{:else if file?.type.startsWith("audio/")}
  <audio
    controls
    class={classList}
    {style}
    draggable={isDraggable}
    use:draggable
    bind:this={ref}
  >
    <source src={file.url} />
  </audio> -->
<!-- TODO - FileView component for pdf -->
{#if file?.type.startsWith("application/pdf")}
  <div
    class="{classList} min-w-[100px] h-full overflow-hidden"
    {style}
    draggable={isDraggable}
    use:draggable
    bind:this={ref}
  >
    <embed
      src={file.url}
      width="110%"
      height="110%"
      style="pointer-events: none;"
    />
  </div>
{/if}
