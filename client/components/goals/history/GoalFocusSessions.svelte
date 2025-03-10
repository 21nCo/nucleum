<script lang="ts">
  import EmptyStatusView from "$lib/client/elements/feedback/EmptyStatusView.svelte";
  import { sessionLogStore } from "$lib/client/products/pointron/logs/log.store";
  import type { ISessionLog } from "$lib/client/products/pointron/logs/log.type";
  import type { IRecordId } from "$lib/client/types/data.type";
  import { formatSeconds } from "$lib/client/utils/time.utils";
  import { cn } from "$lib/client/utils/ui.utils";
  import { isValidArray } from "$lib/shared/utils/obj.utils";
  import { onMount } from "svelte";
  import { goalStore } from "../goal.store";
  export let id: IRecordId;
  export let isIncludeSubGoals = false;
  let sessionLogs: ISessionLog[] = [];
  let isLoading = true;

  async function refresh() {
    isLoading = true;
    if (isIncludeSubGoals) {
      const subGoals = await goalStore.selectMany({
        search: {
          properties: ["parent"],
          query: id.toString()
        }
      });
      console.log({ subGoals });
    }
    const result = await sessionLogStore.selectMany({
      filters: {
        goalId: id.toString()
      }
    });
    if (isValidArray(result)) {
      sessionLogs = result;
    } else {
      sessionLogs = [];
    }
    isLoading = false;
  }

  onMount(() => {
    refresh();
  });

  function groupSessionsByDay(logs: ISessionLog[]) {
    const groups = new Map<string, ISessionLog[]>();

    logs.forEach((log) => {
      const date = new Date(log.start).toLocaleDateString();
      if (!groups.has(date)) {
        groups.set(date, []);
      }
      groups.get(date)?.push(log);
    });

    groups.forEach((logs) => {
      logs.sort(
        (a, b) => new Date(b.start).getTime() - new Date(a.start).getTime()
      );
    });

    return Array.from(groups.entries()).sort(
      (a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime()
    );
  }

  function formatTime(date: Date) {
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true
    });
  }
</script>

<div class="flex flex-col w-full h-full gap-4 py-8">
  {#if isLoading || sessionLogs.length === 0}
    <EmptyStatusView
      isLoadingState={isLoading}
      mainText="No focus sessions recorded yet"
    />
  {:else}
    <div class="relative flex flex-col gap-8">
      <div class="absolute left-[5.5px] -top-6 bottom-0 w-[2px] bg-bgs4" />

      {#each groupSessionsByDay(sessionLogs) as [date, dayLogs]}
        <div class="flex flex-col gap-6">
          <div class="flex items-center gap-2">
            <div class="w-3 h-3 rounded-full bg-bgs4 relative z-10" />
            <div class="text-h4 font-medium text-fgs3">
              {new Date(date).toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric"
              })}
            </div>
          </div>

          <div class="flex flex-col gap-4 ml-[5px]">
            {#each dayLogs as log}
              <div class="relative flex items-start pl-6">
                <div class="absolute left-0 top-[10px] w-6 h-[2px] bg-bgs4" />

                <div
                  class="flex-1 flex flex-col gap-3 py-2 px-3 rounded bg-bgs2 hover:bg-bgs3 transition-colors h-24 justify-between"
                >
                  <div class="text-b2 font-medium">
                    {formatTime(new Date(log.start))} - {formatTime(
                      new Date(log.end)
                    )}
                  </div>

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
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>
