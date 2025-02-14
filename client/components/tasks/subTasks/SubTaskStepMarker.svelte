<script lang="ts">
  import { cn } from "$lib/client/utils/ui.utils";
  import { Size } from "$lib/client/types/size.enum";
  import { TaskStatus, type ITask } from "../task.type";
  import Icon from "$lib/client/elements/Icon.svelte";
  import { hoverable } from "$lib/client/actions/hover.action";
  import { ResourceAccessPoint } from "../../flux/resourceStores/resource.type";
  import { resolveTaskStatusIcon } from "../task.utils";

  export let subTask:
    | ITask
    | { label?: string; type: string; status: TaskStatus };
  export let index: number;
  export let totalLength: number;
  export let accessPoint: ResourceAccessPoint | undefined = undefined;
  let isHovering = false;
  $: statusIcon = resolveTaskStatusIcon(subTask.status);
</script>

<div class="flex flex-col items-center relative z-10">
  <div
    class={cn(
      "w-8 h-8 rounded-full text-fgs3 text-b2 flex items-center justify-center border",
      (!subTask.status || subTask.status === TaskStatus.NOT_STARTED) && {
        "bg-bgs2 border-brs3": true,
        "group-hover:bg-aps2 group-hover:border-aps1 group-hover:text-aps1":
          subTask.label
      },
      {
        "bg-aps2 border-aps1 text-b2":
          subTask.status === TaskStatus.IN_PROGRESS ||
          subTask.status === TaskStatus.COMPLETED,
        "border-dashed": subTask.status === TaskStatus.IN_PROGRESS
      }
    )}
    use:hoverable={{
      onHover: (val) => {
        isHovering = val;
      }
    }}
  >
    {#if isHovering}
      <Icon
        icon="ph:dots-six-vertical"
        class={cn({
          "text-aps1": accessPoint !== ResourceAccessPoint.FORM,
          "text-fgs3": accessPoint === ResourceAccessPoint.FORM
        })}
        size={Size.sm}
      />
    {:else if subTask.status === TaskStatus.COMPLETED}
      <Icon icon={statusIcon} class="text-aps1" size={Size.sm} />
    {:else if subTask.status === TaskStatus.IN_PROGRESS}
      <Icon icon={statusIcon} class="text-aps1" size={Size.sm} />
    {:else if subTask.type === "add"}
      <Icon icon="ph:plus-light" class="text-fgs3" size={Size.sm} />
    {:else}
      {index + 1}
    {/if}
  </div>
  {#if index !== totalLength - 1}
    <div
      class={cn("w-0.5 h-12 border absolute top-8 left-4 -translate-x-1/2", {
        "border-brs3":
          !subTask.status || subTask.status === TaskStatus.NOT_STARTED,
        "border-dashed": subTask.status !== TaskStatus.COMPLETED,
        "border-aps1":
          subTask.status === TaskStatus.IN_PROGRESS ||
          subTask.status === TaskStatus.COMPLETED
      })}
    />
  {/if}
</div>
