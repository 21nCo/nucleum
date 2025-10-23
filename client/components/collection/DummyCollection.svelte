<script lang="ts">
  import {
    ResourceAccessMode,
    ResourceAccessPoint
  } from "@21n/components/flux/resourceStores/resource.type";
  import Collection from "@21n/components/collection/Collection.svelte";
  export let id: any;
  export let accessPoint: ResourceAccessPoint = ResourceAccessPoint.SELF;
  export let parentBgIndex: number = 1;

  export let accessMode: ResourceAccessMode = ResourceAccessMode.POP;
  // TODO - This component is created to resolve issue of actionMap item for Resource.collection -> component is resolving as undefined when directly using Collection.svelte for some reason. Need to find the root cause and fix it.
</script>

<Collection {id} {accessPoint} {parentBgIndex} {accessMode} />
