<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import ProfilePicture from "@21n/components/settings/account/ProfilePicture.svelte";
  import { Size } from "@21n/types/size.enum";
  import account from "@21n/stores/account.store";
  import { userPreferences } from "@21n/components/settings/userPreferences.store";
  import { isValidString } from "@21n/shared-utils/text.utils";
  import Button from "@21n/elements/button/Button.svelte";
  import { ButtonStyle } from "@21n/types/button.type";
  import { fly } from "svelte/transition";
  import { quintOut } from "svelte/easing";
  import OfflineStatusMessage from "@21n/elements/feedback/OfflineStatusMessage.svelte";
  export let transitionDuration: number = 250;
  const dispatch = createEventDispatcher();

  function handleSettingsClick() {
    dispatch("settings");
  }

  $: displayName =
    isValidString($userPreferences.name) ||
    isValidString($account.userInfo?.nickName) ||
    "User";

  function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return "morning";
    if (hour < 18) return "afternoon";
    return "evening";
  }
</script>

<div
  class="flex items-center justify-between p-4"
  transition:fly={{ y: -10, duration: transitionDuration, easing: quintOut }}
>
  <div class="flex items-center gap-3">
    <button class="flex items-center gap-3" on:click={handleSettingsClick}>
      <ProfilePicture context="mobile-topbar" />
      <div class="flex flex-col items-start">
        <span class="text-fgs3 text-b3">Good {getGreeting()}</span>
        <span class="text-fgs1 text-h4 font-medium">{displayName}</span>
      </div>
    </button>
  </div>
  <div class="flex items-center gap-2">
    <OfflineStatusMessage />
    <Button
      icon="gear"
      style={ButtonStyle.OUTLINED}
      size={Size.lg}
      on:click={handleSettingsClick}
    />
  </div>
</div>
