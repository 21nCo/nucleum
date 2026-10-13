<script lang="ts">
  import ProfilePicture from "@nucleum/surfaces/account/profile/ProfilePicture.svelte";
  import { Size } from "@21n/ui/elements/size.enum";
  import account from "@nucleum/client/runtime/account/account.store";
  import { userPreferences } from "@nucleum/shared-state/preferences/user-preferences.store";
  import { isValidString } from "@21n/shared-utils/text.utils";
  import Button from "@21n/ui/elements/button/Button.svelte";
  import { ButtonStyle } from "@21n/ui/elements/button/button.type";
  import { fly } from "svelte/transition";
  import { quintOut } from "svelte/easing";
  import OfflineStatusIndicator from "@nucleum/surfaces/settings/sync/OfflineStatusIndicator.svelte";
  let {
    transitionDuration = 250,
    onSettings = undefined
  }: {
    transitionDuration?: number;
    onSettings?: (() => void) | undefined;
  } = $props();

  function handleSettingsClick() {
    onSettings?.();
  }

  const displayName =
    $derived(
      isValidString($userPreferences.name) ||
      isValidString($account.userInfo?.nickName) ||
      "User"
    );

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
    <button class="flex items-center gap-3" onclick={handleSettingsClick}>
      <ProfilePicture context="mobile-topbar" />
      <div class="flex flex-col items-start">
        <span class="text-fgs3 text-b3">Good {getGreeting()}</span>
        <span class="text-fgs1 text-h4 font-medium">{displayName}</span>
      </div>
    </button>
  </div>
  <div class="flex items-center gap-2">
    <OfflineStatusIndicator />
    <Button
      icon="gear"
      style={ButtonStyle.OUTLINED}
      size={Size.lg}
      onclick={handleSettingsClick}
    />
  </div>
</div>
