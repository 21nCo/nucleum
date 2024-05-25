<script lang="ts">
  import { page } from "$app/stores";
  import Icon from "$lib/client/elements/Icon.svelte";
  import { onMount } from "svelte";
  import TopNavItem from "./TopNavItem.svelte";
  import account from "$lib/client/stores/account.store";
  import Button from "$lib/client/elements/button/Button.svelte";
  //TODO - remove dependency on localEvent
  import { GatheryEvent } from "$local/types/localEvent.enum";
  import { spaceInContext } from "$lib/client/stores/space.store";
  import { appStore } from "$lib/client/stores/app.store";
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

<div
  class="fixed z-50 right-0 bottom-0 flex justify-end bg-bgs1 pb-4 px-4 h-16"
>
  <div class="flex items-center gap-6 rounded-full bg-bgs2 px-4">
    {#if !isCollapsed}
      <div class="flex items-center px-4">
        <Button
          label={$spaceInContext?.label ?? "none selected"}
          on:click={() => appStore.runAction(GatheryEvent.SPACE_BROWSER)}
        />
        &nbsp;&nbsp;⏐&nbsp;&nbsp;
        <!-- <span class="text-fgs2 text-b2">
          {$account.userInfo?.nickName || "Guest"}</span
        > -->
      </div>
      {#each items as item}
        <TopNavItem
          {item}
          isActive={selected === item}
          on:click={() => {
            selected = item;
            appStore.runAction(item);
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
        isActive={false}
        isShowLabel={true}
        on:click={() => appStore.runAction(selected)}
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
