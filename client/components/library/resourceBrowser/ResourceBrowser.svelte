<script lang="ts">
  import { Resource } from "../../flux/resourceStores/resource.enum";
  import LibraryRelationsPane from "../../tags/LibraryRelationsPane.svelte";
  import { isCustomPane } from "../library.utils";
  import DefaultResourceBrowserV2 from "./DefaultResourceBrowserV2.svelte";
  export let resource: Resource;
  export let isLibraryNavContext: boolean = false;

  $: customBrowser = isCustomPane(resource);
</script>

{#key resource}
  {#if customBrowser}
    {#if resource === Resource.relation}
      <LibraryRelationsPane {isLibraryNavContext} on:back />
    {/if}
  {:else}
    <DefaultResourceBrowserV2 {resource} on:back />
  {/if}
{/key}
