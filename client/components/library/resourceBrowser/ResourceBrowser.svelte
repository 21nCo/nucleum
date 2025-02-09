<script lang="ts">
  import { Resource } from "../../flux/resourceStores/resource.enum";
  import LibraryRelationsPane from "../../tags/LibraryRelationsPane.svelte";
  import DefaultResourceBrowserV2 from "./DefaultResourceBrowserV2.svelte";
  export let resource: Resource;
  export let isLibraryNavContext: boolean = false;

  $: customBrowser = [Resource.relation, Resource.task].includes(resource);
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
