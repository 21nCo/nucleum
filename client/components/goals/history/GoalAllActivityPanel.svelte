<script lang="ts">
  import { onMount } from "svelte";
  import { accessLogStore } from "$lib/client/components/accessLogging/accesslog.store";
  import { isValidArrayWithData } from "$lib/shared/utils/obj.utils";
  import type { IAccessLog } from "$lib/client/components/accessLogging/accessLog.type";
  import EmptyStatusView from "$lib/client/elements/feedback/EmptyStatusView.svelte";
  import { flux } from "$lib/client/components/flux/flux";
  import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
  import { logger } from "$lib/client/components/debug/logger.client";
  import {
    PersistenceActionType,
    type IMutation
  } from "$lib/client/types/data.type";
  import ScrollViewBottomSpacer from "$lib/client/layout/scrollView/ScrollViewBottomSpacer.svelte";
  import { resolveMutationAction } from "$lib/client/components/flux/flux.utils";
  import { sessionStore } from "$lib/client/products/pointron/focus/session.store";
  import { sessionLogStore } from "$lib/client/products/pointron/logs/log.store";
  import type {
    ISessionThumb,
    ISessionLog
  } from "$lib/client/products/pointron/logs/log.type";
  import { isSameResource } from "$lib/client/components/flux/resourceStores/resource.utils";
  import { formatSeconds } from "$lib/client/utils/time.utils";
  import { appStore } from "$lib/client/stores/app.store";
  import { ResourceAccessMode } from "../../flux/resourceStores/resource.type";
  import { cn } from "$lib/client/utils/ui.utils";

  export let goalId: string;
  export let createdAt: string;

  let accessLogs: {
    action: string;
    timestamp: Date;
    type: "activity" | "focus";
    session?: ISessionThumb;
    logs?: ISessionLog[];
  }[] = [];
  let isLoading: boolean = false;

  onMount(() => {
    refresh();
  });

  async function refresh() {
    try {
      isLoading = true;
      accessLogs = [];

      // Add creation event
      if (createdAt) {
        accessLogs.push({
          action: "Created",
          timestamp: new Date(createdAt),
          type: "activity"
        });
      }

      if (!goalId) return;

      // Get access logs
      const result = await accessLogStore.selectMany({
        filters: {
          resourceId: goalId.toString()
        }
      });

      if (isValidArrayWithData(result)) {
        const openActions = result.map((log: IAccessLog) => ({
          action: "Opened",
          timestamp: new Date(log.createdAt),
          type: "activity"
        }));
        accessLogs = [...accessLogs, ...openActions];
      }

      // Get mutations
      const mutations = await flux.selectMany(
        Resource.mutation,
        {
          filters: {
            resource: Resource.goal,
            resourceId: goalId.toString()
          }
        },
        {
          isUseCloud: true
        }
      );
      console.log({ mutations });

      if (isValidArrayWithData(mutations)) {
        const _mutations = mutations.filter(
          (m: IMutation) =>
            m.params.action !== PersistenceActionType.MERGE ||
            (m.params.action === PersistenceActionType.MERGE &&
              m.params.record.modifiedAt)
        );
        accessLogs = [
          ...accessLogs,
          ..._mutations.map((mutation: IMutation) => ({
            action: resolveMutationAction(mutation),
            timestamp: new Date(mutation.createdAt),
            type: "activity"
          }))
        ];
      }

      const sessionLogs = await sessionLogStore.selectMany({
        filters: {
          goalId: goalId.toString()
        }
      });

      if (isValidArrayWithData(sessionLogs)) {
        const sessionsResult = await sessionStore.selectMany({
          filters: {
            id: sessionLogs.map((log: ISessionLog) => log.sessionId)
          }
        });

        if (isValidArrayWithData(sessionsResult)) {
          const focusSessions = sessionsResult.map(
            (session: ISessionThumb) => ({
              action: `Focus session - ${formatSeconds(session.elapsed)}`,
              timestamp: new Date(session.startUnix),
              type: "focus",
              session,
              logs: sessionLogs.filter((log: ISessionLog) =>
                isSameResource(log.sessionId, session)
              )
            })
          );
          accessLogs = [...accessLogs, ...focusSessions];
        }
      }

      // Sort all activities by timestamp
      accessLogs = accessLogs.sort(
        (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
      );
    } catch (e) {
      logger.error({ at: "GoalAllActivityPanel.refresh", e });
    } finally {
      isLoading = false;
    }
  }
</script>

<div class="flex flex-col gap-6 w-full h-full">
  {#if isLoading || !accessLogs}
    <EmptyStatusView
      isLoadingState={isLoading}
      subText="History not available"
    />
  {:else}
    <div class="flex flex-col gap-3 overflow-y-auto">
      {#each accessLogs as accessLog}
        <button
          class={cn("flex items-center justify-between gap-2 p-2 rounded-lg", {
            "cursor-pointer hover:bg-bgs2": accessLog.type === "focus"
          })}
          on:click={() => {
            if (accessLog.type === "focus" && accessLog.session?.id) {
              appStore.openResource(
                accessLog.session.id,
                ResourceAccessMode.POP
              );
            }
          }}
        >
          <span class="text-fgs2">{accessLog.action}</span>
          <span class="text-fgs3 text-sm">
            {accessLog.timestamp.toLocaleString()}
          </span>
        </button>
      {/each}
      <ScrollViewBottomSpacer />
    </div>
  {/if}
</div>
