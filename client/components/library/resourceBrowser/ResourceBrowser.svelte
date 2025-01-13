<script lang="ts">
  import { Resource } from "../../flux/resourceStores/resource.enum";
  import LibraryTagsPane from "../../tags/LibraryTagsPane.svelte";
  import DefaultResourceBrowserV2 from "./DefaultResourceBrowserV2.svelte";
  export let resource: Resource;
  export let isLibraryNavContext: boolean = false;

  $: customBrowser = [Resource.tag, Resource.task].includes(resource);
</script>

{#key resource}
  {#if customBrowser}
    {#if resource === Resource.tag}
      <LibraryTagsPane {isLibraryNavContext} on:back />
    {/if}
  {:else}
    <DefaultResourceBrowserV2 {resource} {isLibraryNavContext} on:back />
  {/if}
{/key}
