<script lang="ts">
  import { ResourceAccessPoint } from "@21n/components/flux/resourceStores/resource.type";
  import Task from "@21n/components/tasks/Task.svelte";

  let {
    id,
    accessPoint = ResourceAccessPoint.SELF
  }: {
    id: any;
    accessPoint?: ResourceAccessPoint;
  } = $props();
</script>

<Task {id} {accessPoint} />
