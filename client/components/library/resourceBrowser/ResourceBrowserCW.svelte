<script lang="ts">
  import { Resource } from "../../flux/resourceStores/resource.enum";
  import LibraryTagsPane from "../../tags/LibraryTagsPane.svelte";
  import DefaultResourceBrowserCw from "./DefaultResourceBrowserCW.svelte";
  export let resource: Resource;

  $: customBrowser = [Resource.tag, Resource.task].includes(resource);
</script>

{#key resource}
  {#if customBrowser}
    {#if resource === Resource.tag}
      <LibraryTagsPane isLibraryNavContext={true} on:back />
    {/if}
  {:else}
    <DefaultResourceBrowserCw {resource} on:back />
  {/if}
{/key}
