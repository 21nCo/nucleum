<script lang="ts">
  import { cn } from "@21n/utils/ui.utils";
  import { onMount } from "svelte";
  import { flux } from "@21n/components/flux/flux";
  import { formatDatetime } from "@21n/utils/time.utils";
  import { userPreferences } from "@21n/components/settings/userPreferences.store";
  let status: "SYNCED" | "PENDING" = "SYNCED";
  let itemsPendingForSync: any[] = [];
  let lastSyncedAt: string | null = null;
  onMount(async () => {
    const { mutations, lastSyncUp: _lastSyncedAt } =
      await flux.resolveItemsForSyncUp();
    // console.log({ mutations, lastSyncUp: _lastSyncedAt });
    if (mutations && mutations.length > 0) {
      status = "PENDING";
      itemsPendingForSync = mutations;
    }
    lastSyncedAt = _lastSyncedAt;
  });
</script>

<div class="flex items-center gap-1 border- border-brs3 px-4 py-1 rounded-md">
  <span
    class={cn("w-3 h-3 rounded-full", {
      "bg-ags1": status === "SYNCED",
      "bg-ass1": status === "PENDING"
    })}
  >
  </span>
  <span class="text-b3 text-fgs3"
    >{status === "SYNCED"
      ? "Synced"
      : `Pending ${itemsPendingForSync?.length} items`}</span
  >
  {#if lastSyncedAt}
    <span class="text-b3 text-fgs3 text-end"
      >- Last synced at:
      {formatDatetime($userPreferences, new Date(+lastSyncedAt))}</span
    >
  {/if}
</div>
