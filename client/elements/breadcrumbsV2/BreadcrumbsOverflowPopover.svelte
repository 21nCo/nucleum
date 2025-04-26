<script lang="ts">
  import { ResourceAccessMode } from "$lib/client/components/flux/resourceStores/resource.type";
  import { appStore } from "$lib/client/stores/app.store";
  import type { IRecordId } from "$lib/client/types/data.type";
  import BreadcrumbItem from "./BreadcrumbItem.svelte";
  import type { IBreadcrumbItem } from "./breadcrumbItem.type";
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
            appStore.openResource(item.resourceId, ResourceAccessMode.POP, {
              replaceId
            });
          }
        }}
      />
    </div>
  {/each}
</div>
