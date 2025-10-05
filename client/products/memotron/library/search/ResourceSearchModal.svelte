<script lang="ts">
  import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
  import { onMount } from "svelte";
  import ResourceSearchBase from "./ResourceSearchBase.svelte";
  import { appStore } from "$lib/client/stores/app.store";
  import { Action } from "$lib/client/types/action.enum";

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
  {searchQuery}
  isGlobalSearchModal={true}
  on:close={() => {
    appStore.closeResource({
      id: Action.GLOBAL_SEARCH
    });
  }}
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
    placeholder={`Type here to search ${resource === Resource.everything ? "anything" : resource + "s"}`}
    class="pl-4 text-h3 w-full bg-transparent focus:outline-none focus:border-none"
  />
</ResourceSearchBase>
