<script lang="ts">
  import { Resource } from "../../flux/resourceStores/resource.enum";
  import LibraryRelationsPane from "../../tags/LibraryRelationsPane.svelte";
  import DefaultResourceBrowserCw from "./DefaultResourceBrowserCW.svelte";
  export let resource: Resource;

  $: customBrowser = [Resource.relation, Resource.task].includes(resource);
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
