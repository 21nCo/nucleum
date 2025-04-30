<script lang="ts">
  import { ResourceAccessPoint } from "../flux/resourceStores/resource.type";
  import Task from "./Task.svelte";
  export let id: any;
  export let accessPoint: ResourceAccessPoint = ResourceAccessPoint.SELF;

  // TODO - This component is created to resolve issue of actionMap item for Resource.task -> component is resolving as undefined when directly using Task.svelte for some reason. Need to find the root cause and fix it. - also happening for Resource.collection
</script>

<Task {id} {accessPoint} />
