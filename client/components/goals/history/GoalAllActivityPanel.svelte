<script lang="ts">
  import { onMount } from "svelte";
  import { accessLogStore } from "@21n/components/accessLogging/accesslog.store";
  import { isValidArrayWithData } from "@21n/shared-utils/obj.utils";
  import type { IAccessLog } from "@21n/components/accessLogging/accessLog.type";
  import EmptyStatusView from "@21n/elements/feedback/EmptyStatusView.svelte";
  import { flux } from "@21n/components/flux/flux";
  import { Resource } from "@21n/components/flux/resourceStores/resource.enum";
  import { logger } from "@21n/components/debug/logger.client";
  import {
    PersistenceActionType,
    type IMutation
  } from "@21n/types/data.type";
  import ScrollViewBottomSpacer from "@21n/layout/scrollView/ScrollViewBottomSpacer.svelte";
  import { resolveMutationAction } from "@21n/components/flux/flux.utils";
  import { sessionStore } from "@21n/products/pointron/focus/session.store";
  import { sessionLogStore } from "@21n/products/pointron/logs/log.store";
  import type {
    ISessionThumb,
    ISessionLog
  } from "@21n/products/pointron/logs/log.type";
  import { isSameResource } from "@21n/components/flux/resourceStores/resource.utils";
  import { formatSeconds } from "@21n/utils/time.utils";
  import { appStore } from "@21n/stores/app.store";
  import { ResourceAccessMode } from "@21n/components/flux/resourceStores/resource.type";
  import { cn } from "@21n/utils/ui.utils";

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
