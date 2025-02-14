<script lang="ts">
  import {
    resolveTaskContextMenu,
    type IActiveTaskStore
  } from "$lib/client/components/tasks/task.store";
  import Breadcrumbs from "$lib/client/elements/breadcrumbsV2/Breadcrumbs.svelte";
  import ContextMenuAction from "$lib/client/elements/contextMenu/ContextMenuAction.svelte";
  import { Placement } from "$lib/client/types/direction.enum";
  import { Size } from "$lib/client/types/size.enum";
  import { cn } from "$lib/client/utils/ui.utils";
  import { ResourceAccessPoint } from "../../flux/resourceStores/resource.type";
  export let task: IActiveTaskStore;
  export let isConstrainedWidth = false;

  function resolveBreadcrumbs() {
    const parentItems = $task.parent?.map((p) => ({
      label: p.label,
      resourceId: p.id?.toString()
    }));
    if (parentItems && parentItems.length > 0) {
      parentItems.push({
        label: $task.label,
        resourceId: $task.id?.toString()
      });
    }
    return parentItems;
  }
</script>

<div class={cn("flex items-center gap-3", { "px-6 pt-2": isConstrainedWidth })}>
  <!-- <Icon icon={resolveTaskTypeIcon($task.type)} class="text-fgs3" /> -->
  <div class="flex-1">
    <Breadcrumbs items={resolveBreadcrumbs()} />
    <h1 class="text-h3 font-medium flex-1">{$task.label}</h1>
  </div>
  <ContextMenuAction
    menuResolver={() => resolveTaskContextMenu($task, ResourceAccessPoint.SELF)}
    position={Placement.BottomCenter}
    id="taskContextMenu"
    size={Size.lg}
  />
</div>
