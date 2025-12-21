<script lang="ts">
  import { AccessMode } from "@21n/components/flux/resourceStores/resource.type";
  import { appStore } from "@21n/stores/app.store";
  import type { IRecordId } from "@21n/types/data.type";
  import BreadcrumbItem from "@21n/elements/breadcrumbsV2/BreadcrumbItem.svelte";
  import type { IBreadcrumbItem } from "@21n/elements/breadcrumbsV2/breadcrumbItem.type";
  export let items: IBreadcrumbItem[];
  export let replaceId: IRecordId;
</script>

<div class="p-2 w-72 bg-bgs2 flex flex-col gap-2">
  {#each items as item, index (item)}
    <div class="flex w-full truncate">
      <BreadcrumbItem
        label={item.label}
        isOverflowItem={true}
        on:click={(e) => {
          if (item.resourceId) {
            appStore.openResource(item.resourceId, AccessMode.POP, {
              replaceId
            });
          }
        }}
      />
    </div>
  {/each}
</div>
