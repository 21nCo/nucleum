<script lang="ts">
  import type {
    ISessionLogThumb,
    ISessionThumb
  } from "$lib/client/products/pointron/logs/log.type";
  import { appStore } from "$lib/client/stores/app.store";
  import { formatSeconds } from "$lib/client/utils/time.utils";
  import { cn } from "$lib/client/utils/ui.utils";
  import { ResourceAccessMode } from "../../flux/resourceStores/resource.type";
  export let session: ISessionThumb;
  export let logs: ISessionLogThumb[] = [];

  function formatTime(date: Date) {
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true
    });
  }
</script>

<button
  class="relative flex items-start pl-6"
  on:click={(e) => {
    appStore.resourceClickHandler(e, session.id);
  }}
>
  <div class="absolute left-0 top-[10px] w-6 h-[2px] bg-bgs4" />

  <div
    class="flex-1 flex flex-col items-start gap-3 p-4 rounded bg-bgs2 hover:bg-bgs3 transition-colors h-fit justify-between"
  >
    <div class="text-b2 font-medium">
      {formatTime(new Date(session.startUnix))} - {formatTime(
        new Date(session.endUnix)
      )}
    </div>
    <div class="flex flex-col gap-6 w-full">
      {#each logs as log}
        <div class="flex items-center justify-between w-full">
          <div class="flex flex-col gap-2">
            <div class="flex h-1 w-48">
              {#if log.focus}
                <div
                  class={cn("bg-aps1 rounded-l", {
                    "rounded-r": !log.breakTime
                  })}
                  style="flex: {log.focus}; min-width: 2px;"
                  title="Focus: {formatSeconds(log.focus)}"
                />
              {/if}
              {#if log.breakTime}
                <div
                  class={cn("bg-ass1 rounded-r", {
                    "rounded-l": !log.focus
                  })}
                  style="flex: {log.breakTime}; min-width: 2px;"
                  title="Break: {formatSeconds(log.breakTime)}"
                />
              {/if}
            </div>

            <div class="flex gap-3 text-b3 text-fgs2">
              {#if log.focus}
                <span>Focus: {formatSeconds(log.focus)}</span>
              {/if}
              {#if log.breakTime}
                <span>Break: {formatSeconds(log.breakTime)}</span>
              {/if}
            </div>
          </div>
          {#if log.task}
            <button
              on:click={(e) => {
                e.stopPropagation();
                appStore.resourceClickHandler(e, log.task.id);
              }}
              class="text-b2 notouch:hover:underline"
            >
              {log.task.label}
            </button>
          {/if}
        </div>
      {/each}
    </div>
  </div>
</button>
