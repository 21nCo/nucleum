<script lang="ts">
  import { Resource } from "../../flux/resourceStores/resource.enum";
  import { ResourceAccessPoint } from "../../flux/resourceStores/resource.type";
  import LibraryRelationsPane from "../../tags/LibraryRelationsPane.svelte";
  import TaskLibrary from "../../tasks/TaskLibrary.svelte";
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
    {:else if resource === Resource.task}
      <TaskLibrary accessPoint={ResourceAccessPoint.BROWSER} />
    {/if}
  {:else}
    <DefaultResourceBrowserV2 {resource} on:back />
  {/if}
{/key}
