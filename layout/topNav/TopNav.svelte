<script lang="ts">
  import { page } from "$app/stores";
  import Icon from "$lib/tidy/elements/Icon.svelte";
  import { runAction } from "$lib/tidy/utils/utils";
  import { onMount } from "svelte";
  import TopNavItem from "./TopNavItem.svelte";
  import { account } from "$lib/tidy/stores/app.store";
  export let items: string[];
  let selected: string = items[0];
  let isCollapsed: boolean = false;
  onMount(() => {
    const pageSub = page.subscribe((x) => {
      const item = items.find((y) => y === x.params?.route);
      if (item) selected = item;
    });
    return () => {
      pageSub();
    };
  });
</script>

<div class="fixed z-50 right-0 flex justify-end bg-bgs1 pt-4 px-4 h-16">
  <div class="flex items-center gap-6 rounded-full bg-bgs2 px-4">
    {#if !isCollapsed}
      <div class="flex items-center px-8">
        Blank labs &nbsp;&nbsp;⏐&nbsp;&nbsp;
        <span class="text-fgs2 text-b2">
          {$account.userInfo?.nickName || "Guest"}</span
        >
      </div>
      {#each items as item}
        <TopNavItem
          {item}
          isActive={selected === item}
          on:click={() => {
            selected = item;
            runAction(item);
          }}
        />
      {/each}
      <!-- <PanelSwitcher
        {items}
        bind:selected
        style={PanelSwitcherStyle.TRAIN}
        on:switch={handleSwitch}
      /> -->
      <!-- <Icon icon="settings" on:click={() => runAction(AppEvent.SETTINGS)} />
      <Icon icon="help" on:click={() => runAction(AppEvent.HELP)} /> -->
    {:else}
      <TopNavItem
        item={selected}
        isActive={true}
        on:click={() => runAction(selected)}
      />
    {/if}

    <Icon
      icon={isCollapsed ? "chevdoubleleft" : "chevdoubleright"}
      on:click={() => {
        isCollapsed = !isCollapsed;
      }}
    />
  </div>
</div>
