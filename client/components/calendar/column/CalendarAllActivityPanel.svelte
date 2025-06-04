<script lang="ts">
  import { onMount } from "svelte";
  import { flux } from "../../flux/flux";
  import { Resource } from "../../flux/resourceStores/resource.enum";
  import { isValidArrayWithData } from "$lib/shared/utils/obj.utils";
  import { type IMutation, type IRecordId } from "$lib/client/types/data.type";
  import { logger } from "../../debug/logger.client";
  import { resolveMutationLabel } from "../../flux/flux.utils";
  import { formatSeconds, formatTime } from "$lib/client/utils/time.utils";
  import { userPreferences } from "../../settings/userPreferences.store";
  import { SearchStore } from "../../record/record.store";
  import { appStore } from "$lib/client/stores/app.store";
  import { ResourceAccessMode } from "../../flux/resourceStores/resource.type";
  import EmptyStatusView from "$lib/client/elements/feedback/EmptyStatusView.svelte";
  import ScrollViewBottomSpacer from "$lib/client/layout/scrollView/ScrollViewBottomSpacer.svelte";
  import { Product } from "$lib/client/types/product.type";
  import { tzStore } from "$lib/client/components/settings/timezone/tz.store";
  import { resolveProductResources } from "../../flux/resourceStores/resource.utils";
  import { rootNodeTypeList } from "$lib/client/products/memotron/node/node.type";

  export let date: Date;
  let isLoading: boolean = false;
  let logs: {
    action: string;
    timestamp: Date;
    resourceLabel?: string;
    resourceId?: IRecordId | IRecordId[];
  }[] = [];
  $: if (date) {
    refresh(date);
  }

  async function refresh(date: Date) {
    try {
      isLoading = true;
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
          isCloudOnlyResource: true
        }
      );
      if (isValidArrayWithData(mutations)) {
        logs = [
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
          logs.push(
            ...focusSessionsResult.map((session: any) => ({
              action: `○ Focus`,
              resourceLabel: formatSeconds(session.elapsed),
              timestamp: new Date(session.startUnix),
              resourceId: [session.id]
            }))
          );
        }
      }
      logs = logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
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
        on:click={() => {
          let id = log.resourceId;
          if (!id) return;
          if (Array.isArray(id)) {
            id = id[0];
          }
          if (!id) return;
          appStore.openResource(id, ResourceAccessMode.POP);
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
