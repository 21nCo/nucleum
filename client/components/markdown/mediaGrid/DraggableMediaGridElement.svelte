<svelte:options accessors={true} />

<script lang="ts">
  import { dragAndDropStore } from "$lib/client/stores/app.store";
  import view from "$lib/client/stores/view.store";
  import { DragStatus } from "$lib/client/types/dragstatus.enum";

  export let isGridItem: boolean = true;
  export let item: any;
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

{#if item.type.startsWith("image/")}
  <img
    alt="..."
    class={classList}
    on:load
    src={item.URL}
    {style}
    draggable={isDraggable}
    use:draggable
    bind:this={ref}
  />
{:else if item.type.startsWith("video/")}
  <video
    controls
    class={classList}
    {style}
    draggable={isDraggable}
    use:draggable
    bind:this={ref}
  >
    <source src={item.URL} />
    <track kind="captions" />
  </video>
{:else if item.type.startsWith("audio/")}
  <audio
    controls
    class={classList}
    {style}
    draggable={isDraggable}
    use:draggable
    bind:this={ref}
  >
    <source src={item.URL} />
  </audio>
{:else if item.type.startsWith("application/pdf")}
  <div
    class="{classList} min-w-[100px] h-full overflow-hidden"
    {style}
    draggable={isDraggable}
    use:draggable
    bind:this={ref}
  >
    <embed
      src={item.URL}
      width="110%"
      height="110%"
      style="pointer-events: none;"
    />
  </div>
{:else}
  <div
    draggable={false}
    use:draggable
    class="absolute w-full h-full bg-transparent bg-opacity-50 bg-bgs2 flex items-center justify-center"
    style="font-size: 1em;"
  >
    {#if isDragOver}
      Drop @Col:{item.position.columns.columnNo + 1}
    {/if}
  </div>
{/if}

<style>
  .leftThrobbing {
    animation: leftThrobbing 1s infinite;
  }
  .rightThrobbing {
    animation: rightThrobbing 1s infinite;
  }
  .topThrobbing {
    animation: topThrobbing 1s infinite;
  }
  .bottomThrobbing {
    animation: bottomThrobbing 1s infinite;
  }
  @keyframes leftThrobbing {
    0% {
      border-left-color: green;
    }
    50% {
      border-left-color: rgb(14, 153, 247);
    }
    100% {
      border-left-color: green;
    }
  }
  @keyframes rightThrobbing {
    0% {
      border-right-color: green;
    }
    50% {
      border-right-color: rgb(14, 153, 247);
    }
    100% {
      border-right-color: green;
    }
  }
  @keyframes topThrobbing {
    0% {
      border-top-color: green;
    }
    50% {
      border-top-color: rgb(14, 153, 247);
    }
    100% {
      border-top-color: green;
    }
  }
  @keyframes bottomThrobbing {
    0% {
      border-bottom-color: green;
    }
    50% {
      border-bottom-color: rgb(14, 153, 247);
    }
    100% {
      border-bottom-color: green;
    }
  }
</style>
