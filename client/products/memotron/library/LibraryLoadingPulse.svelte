<script lang="ts">
  import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
  import view from "$lib/client/stores/view.store";
  export let resource: Resource;
  export let isTail: boolean = false;
</script>

{#if resource === Resource.node && $view.isConstrainedWidth}
  <div
    class="animate-pulse grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-4"
  >
    <div class="rounded-md bg-bgs3 h-32" />
    <div class="rounded-md bg-bgs3 h-32" />
    <div class="rounded-md bg-bgs3 h-32" />
    <div class="rounded-md bg-bgs3 h-32" />
  </div>
{:else if isTail}
  <div class="animate-pulse rounded-md bg-bgs3 mo:h-10 h-60" />
  <div class="animate-pulse rounded-md bg-bgs3 mo:h-10 h-60" />
  <div class="animate-pulse rounded-md bg-bgs3 mo:h-10 h-60" />
  <div class="animate-pulse rounded-md bg-bgs3 mo:h-10 h-60" />
{:else}
  <div
    class="animate-pulse grid grid-cols-[repeat(auto-fill,minmax(290px,1fr))] gap-4"
  >
    <div class="rounded-md bg-bgs3 mo:h-10 h-60" />
    <div class="rounded-md bg-bgs3 mo:h-10 h-60" />
    <div class="rounded-md bg-bgs3 mo:h-10 h-60" />
    <div class="rounded-md bg-bgs3 mo:h-10 h-60" />
    <div class="rounded-md bg-bgs3 mo:h-10 h-60" />
  </div>
{/if}
