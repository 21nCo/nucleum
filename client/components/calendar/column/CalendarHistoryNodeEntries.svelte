<script lang="ts">
  import EmptyStatusView from "@21n/elements/feedback/EmptyStatusView.svelte";
  import { nodeStore } from "@21n/products/memotron/node/node.store";
  import type { INodeThumb } from "@21n/products/memotron/node/node.type";
  import { Arrangement } from "@21n/types/direction.enum";
  import { isValidArrayWithData } from "@21n/shared-utils/obj.utils";
  import { ResourceAccessPoint } from "@21n/components/flux/resourceStores/resource.type";
  import Records from "@21n/components/record/Records.svelte";
  import { tzStore } from "@21n/components/settings/timezone/tz.store";

  let { date }: { date: Date } = $props();
  let isLoading = $state(false);
  let data = $state<INodeThumb[]>([]);

  $effect(() => {
    if (date) {
      refresh(date);
    }
  });

  async function refresh(date: Date) {
    isLoading = true;
    try {
      const dateFilter = tzStore.resolveTimePeriodFilter(date, {
        isReturnAsDateObjectFilter: true
      });
      const result = await nodeStore.selectMany(
        {
          filters: {
            createdAt: dateFilter
          }
        },
        {
          isExpand: true
        }
      );
      if (isValidArrayWithData(result)) {
        data = [...result].sort((a, b) => b.createdAt - a.createdAt);
      } else {
        data = [];
      }
    } catch (error) {
      console.error(error);
    } finally {
      isLoading = false;
    }
  }
</script>

{#if data.length > 0}
  <Records
    {data}
    arrangement={Arrangement.LIST}
    accessPoint={ResourceAccessPoint.CALENDAR}
    isShowBottomSpacer={true}
  />
{:else}
  <EmptyStatusView mainText="No history entries" isLoadingState={isLoading} />
{/if}
