<svelte:options runes={true} />

<script lang="ts">
  import type { Snippet } from "svelte";
  import ProfilePicture from "@nucleum/surfaces/account/profile/ProfilePicture.svelte";
  import OfflineStatusIndicator from "@nucleum/surfaces/settings/sync/OfflineStatusIndicator.svelte";
  import InlineSyncingFeedback from "@nucleum/shell/sync/InlineSyncingFeedback.svelte";
  import { Resource } from "@nucleum/datafn/resource.enum";
  import account from "@nucleum/client/runtime/account/account.store";
  import { userPreferences } from "@nucleum/shared-state/preferences/user-preferences.store";
  import { isValidString } from "@21n/shared-utils/text.utils";
  import Button from "@21n/ui/elements/button/Button.svelte";
  import { ButtonStyle } from "@21n/ui/elements/button/button.type";
  import { Size } from "@21n/ui/elements/size.enum";

  let {
    indicators = undefined,
    onSettings
  }: {
    /** Product status chips, such as a running focus session. */
    indicators?: Snippet;
    onSettings: () => void;
  } = $props();

  const displayName = $derived(
    isValidString($userPreferences.name) ||
      isValidString($account.userInfo?.nickName) ||
      "User"
  );

  function resolveGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return "morning";
    if (hour < 18) return "afternoon";
    return "evening";
  }
</script>

<div class="flex items-center justify-between gap-2 p-4">
  <button
    type="button"
    class="flex items-center gap-3 min-w-0"
    onclick={onSettings}
  >
    <span class="shrink-0">
      <ProfilePicture context="mobile-topbar" />
    </span>
    <div class="flex flex-col items-start min-w-0">
      <span class="text-fgs3 text-b3 whitespace-nowrap">
        Good {resolveGreeting()}
      </span>
      <span class="text-fgs1 text-h4 font-medium truncate max-w-full">
        {displayName}
      </span>
    </div>
  </button>
  <div
    class="flex items-center gap-1 shrink-0"
    data-testid="phone-home-indicators"
  >
    <OfflineStatusIndicator isIconOnly={true} />
    <InlineSyncingFeedback
      resource={Resource.everything}
      isShorter={true}
      text="Syncing..."
    />
    {@render indicators?.()}
    <Button
      icon="gear"
      style={ButtonStyle.OUTLINED}
      size={Size.lg}
      ariaLabel="Settings"
      testId="phone-home-settings"
      onclick={onSettings}
    />
  </div>
</div>
