<script lang="ts">
  import { onMount } from "svelte";
  import type { IActiveNodeStore } from "../../node/node.store";
  import { accessLogStore } from "$lib/client/components/accessLogging/accesslog.store";
  import HistoryItem from "./HistoryItem.svelte";
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
  export let node: IActiveNodeStore | null = null;
  let accessLogs: { action: string; timestamp: Date }[] = [];
  let isLoading: boolean = false;
  onMount(() => {
    refresh();
  });

  async function refresh() {
    try {
      isLoading = true;
      if ($node?.createdAt)
        accessLogs = [
          {
            action: "Created",
            timestamp: new Date($node?.createdAt)
          }
        ];
      if (!node?.id) return;
      const result = await accessLogStore.selectMany({
        filters: {
          resourceId: node?.id.toString()
        }
      });
      let openActions: { action: string; timestamp: Date }[] = [];
      if (isValidArrayWithData(result)) {
        openActions = result.map((log: IAccessLog) => ({
          action: "Opened",
          timestamp: new Date(log.createdAt)
        }));
        accessLogs = [...accessLogs, ...openActions];
      }
      const mutations = await flux.selectMany(Resource.mutation, {
        filters: {
          resource: Resource.node,
          resourceId: node.id.toString()
        }
      });
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
            timestamp: new Date(mutation.createdAt)
          }))
        ];
      }
      accessLogs = accessLogs.sort(
        (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
      );
    } catch (e) {
      logger.error({ at: "NodeHistoryPane.refresh", e });
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
        <HistoryItem item={accessLog} />
      {/each}
      <ScrollViewBottomSpacer />
    </div>
  {/if}
</div>
