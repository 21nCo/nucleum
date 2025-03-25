<!-- @deprecated -->
<script lang="ts">
  import { Resource } from "../../flux/resourceStores/resource.enum";
  import LibraryRelationsPane from "../../tags/RelationsBrowser.svelte";
  import DefaultResourceBrowserCw from "./DefaultResourceBrowserCW.svelte";
  import { isCustomLibrary } from "../library.utils";
  export let resource: Resource;

  $: customBrowser = isCustomLibrary(resource);
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
