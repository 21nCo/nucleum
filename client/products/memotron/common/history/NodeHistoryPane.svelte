<script lang="ts">
  import { onMount } from "svelte";
  import type { IActiveNodeStore } from "@21n/products/memotron/node/node.store";
  import { accessLogStore } from "@21n/components/accessLogging/accesslog.store";
  import HistoryItem from "@21n/products/memotron/common/history/HistoryItem.svelte";
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
