<script lang="ts">
  import { onMount } from "svelte";
  import {
    activeSession,
    todayFocusStore
  } from "$lib/client/products/pointron/focus/session.store";
  import LeftNavExpandable from "$lib/client/layout/leftPanel/LeftNavExpandable.svelte";
  import ProfileLeftPanelSection from "$lib/client/components/settings/account/ProfileLeftPanelSection.svelte";

  onMount(() => {
    bootup();
    return () => {
      activeSession.clearIntervals();
    };
  });

  function bootup() {
    // if ($userLocalPreferences?.timerMode == undefined) {
    //   $userLocalPreferences.timerMode = TimerMode.MINIMAL;
    // }
  }
</script>

<LeftNavExpandable>
  <slot name="header" slot="header">
    <div class="flex flex-col w-full justify-center items-center gap-4">
      <ProfileLeftPanelSection />
    </div>
  </slot>
  <!-- <div slot="header" class="flex flex-col gap-1 items-center">
    <div class="text-title">
      {$userPreferences.nickName ?? ""}
    </div>
    {#if $userLocalPreferences.isEnableAgeCounter}
      <AgeTimer />
    {/if}
  </div> -->
</LeftNavExpandable>
