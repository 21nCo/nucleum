<script lang="ts">
  import { appEvents, windowObject } from "$lib/tidy/stores/app.store";
  import { onMount } from "svelte";
  import AppearanceSettings from "./AppearanceSettings.svelte";
  import DailyTargetSettings from "./DailyTargetSettings.svelte";
  import SessionSettings from "./SessionSettings.svelte";
  import StorageSettings from "./StorageSettings.svelte";
  import AccountSettings from "./AccountSettings.svelte";
  import AboutSettings from "./AboutSettings.svelte";
  import { EventType } from "$lib/tidy/types/event.enum";
  import TagsAndRoutines from "$lib/pointron/settings/TagsAndRoutines.svelte";
  export let menuItems: any;
  export let selectedMenuIndex: number = 0;
  $: selected = menuItems[selectedMenuIndex].label;
  onMount(() => {
    windowObject.toggleTopBar(true);
    appEvents.notify(EventType.SHOW_APPEARANCE_PREVIEW, false);
  });
</script>

<div class="flex flex-col gap-4 w-full h-full">
  <div class="text-h1 pb-10 pt-2 item-start text-accent1">
    {selected}
  </div>
  {#if selected == "Account"}
    <AccountSettings />
  {:else if selected == "Appearance"}
    <AppearanceSettings />
  {:else if selected == "Session"}
    <SessionSettings />
  {:else if selected == "Tracking"}
    <DailyTargetSettings />
  {:else if selected == "Data & Sync"}
    <StorageSettings />
  {:else if selected == "About"}
    <AboutSettings />
  {:else if selected == "Tags"}
    <TagsAndRoutines />
  {/if}
</div>

<!-- <a href="/" class="text-fgs2" on:click={onGoback}> go back </a> -->
