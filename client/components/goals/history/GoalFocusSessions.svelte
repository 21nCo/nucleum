<script lang="ts">
  import EmptyStatusView from "$lib/client/elements/feedback/EmptyStatusView.svelte";
  import { sessionLogStore } from "$lib/client/products/pointron/logs/log.store";
  import type {
    ISessionLog,
    ISessionThumb
  } from "$lib/client/products/pointron/logs/log.type";
  import type { IRecordId } from "$lib/client/types/data.type";
  import { isValidArray } from "$lib/shared/utils/obj.utils";
  import { onMount } from "svelte";
  import { goalStore } from "../goal.store";
  import { sessionStore } from "$lib/client/products/pointron/focus/session.store";
  import { isSameResource } from "../../flux/resourceStores/resource.utils";
  import GoalFocusSessionThumbnail from "./GoalFocusSessionThumbnail.svelte";
  import ScrollViewBottomSpacer from "$lib/client/layout/scrollView/ScrollViewBottomSpacer.svelte";
  export let id: IRecordId;
  export let isIncludeSubGoals = false;
  let sessions: ISessionThumb[] = [];
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
      properties: ["*", "taskId.* as task"],
      filters: {
        goalId: id.toString()
      }
    });
    if (isValidArray(result)) {
      sessionLogs = result;
      const sessionsResult = await sessionStore.selectMany({
        filters: {
          id: sessionLogs.map((log) => log.sessionId)
        }
      });
      if (isValidArray(sessionsResult)) {
        sessions = sessionsResult;
      }
    } else {
      sessionLogs = [];
    }
    isLoading = false;
  }

  onMount(() => {
    refresh();
  });

  function groupSessionsByDay(sessions: ISessionThumb[]) {
    const groups = new Map<string, ISessionThumb[]>();

    sessions.forEach((session) => {
      const date = new Date(session.startUnix).toLocaleDateString();
      if (!groups.has(date)) {
        groups.set(date, []);
      }
      groups.get(date)?.push(session);
    });

    groups.forEach((logs) => {
      logs.sort(
        (a, b) =>
          new Date(b.startUnix).getTime() - new Date(a.startUnix).getTime()
      );
    });
    return Array.from(groups.entries()).sort(
      (a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime()
    );
  }
</script>

<div class="flex flex-col w-full h-full gap-4 py-8 overflow-auto">
  {#if isLoading || sessionLogs.length === 0}
    <EmptyStatusView
      isLoadingState={isLoading}
      mainText="No focus sessions recorded yet"
    />
  {:else}
    <div class="relative flex flex-col gap-8 userdata">
      <div class="absolute left-[5.5px] -top-6 bottom-0 w-[2px] bg-bgs4" />

      {#each groupSessionsByDay(sessions) as [date, daySessions]}
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
            {#each daySessions as session}
              <GoalFocusSessionThumbnail
                {session}
                logs={sessionLogs.filter((x) =>
                  isSameResource(x.sessionId, session)
                )}
              />
            {/each}
          </div>
        </div>
      {/each}
      <ScrollViewBottomSpacer />
    </div>
  {/if}
</div>
