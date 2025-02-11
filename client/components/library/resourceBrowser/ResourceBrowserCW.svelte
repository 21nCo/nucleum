<script lang="ts">
  import { Resource } from "../../flux/resourceStores/resource.enum";
  import LibraryRelationsPane from "../../tags/LibraryRelationsPane.svelte";
  import DefaultResourceBrowserCw from "./DefaultResourceBrowserCW.svelte";
  import { isCustomPane } from "../library.utils";
  export let resource: Resource;

  $: customBrowser = isCustomPane(resource);
</script>

{#key resource}
  {#if customBrowser}
    {#if resource === Resource.relation}
      <LibraryRelationsPane isLibraryNavContext={true} on:back />
    {/if}
  {:else}
    <DefaultResourceBrowserCw {resource} on:back />
  {/if}
{/key}
