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

  export let date: Date;
  let isLoading: boolean = false;
  let logs: {
    action: string;
    timestamp: Date;
    resourceLabel?: string;
    resourceId?: IRecordId;
  }[] = [];
  onMount(() => {
    refresh();
  });

  async function refresh() {
    try {
      isLoading = true;
      const mutations = await flux.selectMany(
        Resource.mutation,
        {
          filters: {
            action: ["create", "delete"],
            resource: [
              Resource.goal,
              Resource.task,
              Resource.node,
              Resource.collection,
              Resource.combination
            ],
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
          ...mutations.map((mutation: IMutation) => {
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
      const focusSessionsResult = await new SearchStore(
        Resource.session
      ).select({
        filters: {
          start: date
        }
      });
      if (isValidArrayWithData(focusSessionsResult)) {
        logs.push(
          ...focusSessionsResult.map((session: any) => ({
            action: `○ Focus`,
            resourceLabel: formatSeconds(session.elapsed),
            timestamp: new Date(session.start),
            resourceId: [session.id]
          }))
        );
      }
      logs = logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    } catch (e) {
      logger.error({ at: "CalendarAllActivityPanel.refresh", e });
    } finally {
      isLoading = false;
    }
  }
</script>

{#if isLoading || logs.length === 0}
  <EmptyStatusView
    isLoadingState={isLoading}
    mainText="No activity found."
    isSearchContext={true}
  />
{:else if logs.length > 0}
  <div class="flex flex-col flex-grow gap-4 overflow-y-auto">
    {#each logs as log}
      <button
        class="flex flex-row items-start gap-2 p-2 hover:bg-bgs2 rounded-md"
        on:click={() => {
          if (log.resourceId) {
            appStore.openResource(log.resourceId[0], ResourceAccessMode.POP);
          }
        }}
      >
        <span class="text-b3 text-fgs3 whitespace-nowrap"
          >{formatTime($userPreferences, log.timestamp)}</span
        >
        <div class="flex justify-between gap-4 flex-1">
          <span class="text-b3 text-fgs3">{log.action}</span>
          {#if log.resourceLabel}
            <span class="text-b2 notouch:hover:text-aps1 text-left"
              >{log.resourceLabel}</span
            >
          {/if}
        </div>
      </button>
    {/each}
    <ScrollViewBottomSpacer />
  </div>
{/if}
