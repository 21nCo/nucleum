<script lang="ts">
  import EmptyStatusView from "$lib/client/elements/feedback/EmptyStatusView.svelte";
  import { nodeStore } from "$lib/client/products/memotron/node/node.store";
  import type { INodeThumb } from "$lib/client/products/memotron/node/node.type";
  import { Arrangement } from "$lib/client/types/direction.enum";
  import { isValidArrayWithData } from "$lib/shared/utils/obj.utils";
  import { ResourceAccessPoint } from "../../flux/resourceStores/resource.type";
  import Records from "../../record/Records.svelte";

  export let date: Date;
  let isLoading: boolean;
  let data: INodeThumb[] = [];
  $: if (date) {
    refresh(date);
  }

  async function refresh(date: Date) {
    isLoading = true;
    try {
      date = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const result = await nodeStore.selectMany(
        {
          filters: {
            createdAt: date
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
  />
{:else}
  <EmptyStatusView mainText="No history entries" isLoadingState={isLoading} />
{/if}
