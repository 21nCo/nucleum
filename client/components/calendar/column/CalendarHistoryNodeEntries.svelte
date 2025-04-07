<script lang="ts">
  import { nodeStore } from "$lib/client/products/memotron/node/node.store";
  import type { INodeThumb } from "$lib/client/products/memotron/node/node.type";
  import { Arrangement } from "$lib/client/types/direction.enum";
  import { isValidArrayWithData } from "$lib/shared/utils/obj.utils";
  import { ResourceAccessPoint } from "../../flux/resourceStores/resource.type";
  import Records from "../../record/Records.svelte";

  export let date: Date;
  let data: INodeThumb[] = [];
  $: if (date) {
    refresh(date);
  }

  async function refresh(date: Date) {
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
    }
  }
</script>

<Records
  {data}
  arrangement={Arrangement.LIST}
  accessPoint={ResourceAccessPoint.CALENDAR}
/>
