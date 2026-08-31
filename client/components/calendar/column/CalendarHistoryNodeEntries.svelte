<script lang="ts">
  import EmptyStatusView from "@21n/elements/feedback/EmptyStatusView.svelte";
  import type { INodeThumb } from "@21n/products/memotron/node/node.type";
  import { Arrangement } from "@21n/types/direction.enum";
  import { ResourceAccessPoint } from "@21n/data/datafn/resource.type";
  import Records from "@21n/components/record/Records.svelte";
  import { datafn } from "@21n/stores/datafn.store";
  import { time } from "@datafn/client";
  import { toSvelteStore } from "@datafn/svelte";

  let { date }: { date: Date } = $props();
  const nodeStore = $derived.by(() => {
    if (date) {
      return toSvelteStore<INodeThumb[]>(
        datafn.node.signal({
          select: ["*", "parent.*", "file.*"],
          temporal: time.day("createdAt", date, { storage: "date" })
        }),
        { initialData: [] }
      );
    }
    return toSvelteStore<INodeThumb[]>(datafn.emptySignal([]), {
      initialData: []
    });
  });
  const data = $derived.by(() =>
    [...$nodeStore.data].sort((a, b) => b.createdAt - a.createdAt)
  );
  const isLoading = $derived($nodeStore.loading || $nodeStore.refreshing);
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
