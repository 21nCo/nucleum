<!-- DraggableItem.svelte -->
<script lang="ts">
  import { dragAndDropStore, windowObject } from "$lib/tidy/stores/app.store";
  import { DragStatus } from "$lib/tidy/types/dragstatus.enum";
  export let item: any;
  export let classList: string;
  export let isDraggable: boolean = false;
  export let isDragging: boolean = false;
  export let id:any;
  let ref:any;
  let dragId: any;
  let dragEnterId: any;
  let dropId: any;
  $:dragId=dragEnterId=dropId=id;
  const handleDragStart = () => {
    // console.log("drag started ",item.label)
    isDragging = true;
    dragAndDropStore.update((x: any) => {
      x = { ...x, dragStatus: DragStatus.STARTED, dragItem: item, dragId};
      return x;
    });
  };
  const handleDragEnter = async() => {
    // console.log("drag entered")
    dragAndDropStore.update((x: any) => {
      x = {
        ...x,
        dragStatus: DragStatus.DRAGGING,
        dragEnterItem: item,
        dragEnterId
      };
      return x;
    });
    function isInView(element:any) {
      const parentBoundingBox = element.parentElement.getBoundingClientRect();
      const boundingBox = element.getBoundingClientRect();
      // console.log("p and c ",parentBoundingBox,boundingBox);
      return boundingBox.top >= 0 && boundingBox.bottom <= parentBoundingBox.bottom;
    }
    let isInV=isInView(ref);
    // console.log("isinView ",isInV,item.label);
    if ($windowObject.isInPortraitMode || !isInV) {
       await ref.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };
  const handleDragEnd = () => {
    // console.log("drag ended")
    isDragging = false;
  };

  const handleDrop = () => {
    // console.log("dropped on",item.label)
    dragAndDropStore.update((x: any) => {
      x = { ...x, dragStatus: DragStatus.DROPPED, dropItem: item, dropId};
      return x;
    });
  };
  function onDragOver(event: any) {
    // console.log("drag over",item.label)
    event?.preventDefault();
  }
</script>

<div
  class="{isDraggable ? 'cursor-move' : ''} {classList}"
  draggable={isDraggable}
  on:dragstart|stopPropagation={handleDragStart}
  on:dragend|stopPropagation={handleDragEnd}
  on:dragover|stopPropagation={onDragOver}
  on:dragenter|stopPropagation={handleDragEnter}
  on:drop|stopPropagation={handleDrop}
  on:mouseenter|stopPropagation
  on:mouseleave|stopPropagation
  bind:this={ref}
>
  <slot />
</div>
