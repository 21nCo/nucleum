<script lang="ts">
  import { onMount } from "svelte";
  import { flux } from "@21n/components/flux/flux";
  import { Resource } from "@21n/components/flux/resourceStores/resource.enum";
  import { isValidArrayWithData } from "@21n/shared-utils/obj.utils";
  import { type IMutation, type IRecordId } from "@21n/types/data.type";
  import { logger } from "@21n/components/debug/logger.client";
  import { resolveMutationLabel } from "@21n/components/flux/flux.utils";
  import { formatSeconds, formatTime } from "@21n/utils/time.utils";
  import { userPreferences } from "@21n/components/settings/userPreferences.store";
  import { SearchStore } from "@21n/components/record/record.store";
  import { appStore } from "@21n/stores/app.store";
  import { AccessMode } from "@21n/components/flux/resourceStores/resource.type";
  import EmptyStatusView from "@21n/elements/feedback/EmptyStatusView.svelte";
  import ScrollViewBottomSpacer from "@21n/layout/scrollView/ScrollViewBottomSpacer.svelte";
  import { Product } from "@21n/products/product.type";
  import { tzStore } from "@21n/components/settings/timezone/tz.store";
  import { resolveProductResources } from "@21n/components/flux/resourceStores/resource.utils";
  import { rootNodeTypeList } from "@21n/products/memotron/node/node.type";

  let { date }: { date: Date } = $props();
  let isLoading = $state(false);
  let logs = $state<{
    action: string;
    timestamp: Date;
    resourceLabel?: string;
    resourceId?: IRecordId | IRecordId[];
  }[]>([]);

  $effect(() => {
    if (date) {
      refresh(date);
    }
  });

  async function refresh(date: Date) {
    try {
      isLoading = true;
      let nextLogs: {
        action: string;
        timestamp: Date;
        resourceLabel?: string;
        resourceId?: IRecordId | IRecordId[];
      }[] = [];
      date = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const resources = resolveProductResources($appStore.product);
      const mutations: IMutation[] = await flux.selectMany(
        Resource.mutation,
        {
          filters: {
            action: ["create", "delete"],
            resource: [...(resources ?? [])],
            timestamp: {
              greaterThanOrEqual: date.getTime(),
              lessThanOrEqual: date.getTime() + 24 * 60 * 60 * 1000
            }
          }
        },
        {
          isUseCloud: true
        }
      );
      if (isValidArrayWithData(mutations)) {
        nextLogs = [
          ...mutations.filter(rootNodeFilter).map((mutation: IMutation) => {
            const label = resolveMutationLabel(mutation);
            return {
              action: label.action,
              resourceLabel: label.resourceLabel,
              timestamp: new Date(mutation.createdAt),
              resourceId: mutation.resourceId
            };
          })
        ];
      }
      if (
        $appStore.product === Product.POINTRON ||
        $appStore.product === Product.NUCLEUS
      ) {
        const dayFilter = tzStore.resolveTimePeriodFilterForDay(date);
        const focusSessionsResult = await new SearchStore(
          Resource.session
        ).select({
          filters: {
            startUnix: dayFilter
          }
        });
        if (isValidArrayWithData(focusSessionsResult)) {
          nextLogs.push(
            ...focusSessionsResult.map((session: any) => ({
              action: `○ Focus`,
              resourceLabel: formatSeconds(session.elapsed),
              timestamp: new Date(session.startUnix),
              resourceId: [session.id]
            }))
          );
        }
      }
      logs = nextLogs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      isLoading = false;
    } catch (e) {
      logger.error({ at: "CalendarAllActivityPanel.refresh", e });
      isLoading = false;
    }
  }

  function rootNodeFilter(x: IMutation) {
    if (!x.resourceId) return false;
    if (x.resource !== Resource.node) return true;
    if (
      Array.isArray(x.resourceId) &&
      x.resourceId.length === 1 &&
      "records" in x.params &&
      x.params.records.length === 1
    ) {
      const record = x.params.records[0];
      if (!record) return false;
      return rootNodeTypeList.includes(record.contentType);
    }
    return true;
  }
</script>

{#if isLoading || logs.length === 0}
  <EmptyStatusView
    isLoadingState={isLoading}
    mainText="No activity found."
    isSearchContext={true}
  />
{:else if logs.length > 0}
  <div class="flex flex-col flex-grow gap-4 overflow-y-auto userdata">
    {#each logs as log}
      <button
        class="flex flex-row items-start gap-2 p-2 hover:bg-bgs2 rounded-md"
        onclick={() => {
          let id = log.resourceId;
          if (!id) return;
          if (Array.isArray(id)) {
            id = id[0];
          }
          if (!id) return;
          appStore.openResource(id, AccessMode.POP);
        }}
      >
        <span class="text-b3 text-fgs3 whitespace-nowrap"
          >{formatTime($userPreferences, log.timestamp)}</span
        >
        <div class="flex justify-between gap-4 flex-1">
          <span class="text-b3 text-fgs3 text-left">{log.action}</span>
          {#if log.resourceLabel}
            <span class="text-b2 notouch:hover:text-aps1 text-right"
              >{log.resourceLabel}</span
            >
          {/if}
        </div>
      </button>
    {/each}
    <ScrollViewBottomSpacer />
  </div>
{/if}
