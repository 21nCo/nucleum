<script lang="ts">
  import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
  import { onMount } from "svelte";
  import ResourceSearchBase from "./ResourceSearchBase.svelte";

  let resource: Resource = Resource.everything;
  let searchQuery: string = "";
  let inputRef: HTMLInputElement;
  let searchBaseRef: ResourceSearchBase;
  onMount(async () => {
    inputRef?.focus();
  });
</script>

<ResourceSearchBase
  bind:this={searchBaseRef}
  bind:resource
  isGlobalSearchModal={true}
>
  <input
    bind:this={inputRef}
    bind:value={searchQuery}
    on:keydown={(event) => {
      searchBaseRef?.keydown(event);
    }}
    on:keyup={(event) => {
      searchBaseRef?.keyup(event);
    }}
    type="text"
    placeholder={`Search ${resource === Resource.everything ? "anything" : resource + "s"}`}
    class="text-h3 w-full bg-transparent focus:outline-none focus:border-none"
  />
</ResourceSearchBase>
