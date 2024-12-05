<script lang="ts">
  import account from "$lib/client/stores/account.store";
  import { isValidString } from "$lib/shared/utils/text.utils";
  import { onMount } from "svelte";
  import { logger } from "$lib/client/components/debug/logger.client";
  import { cn } from "$lib/client/utils/ui.utils";
  export let context: "cmd-page" | "cp-profile" | "account-settings" =
    "cp-profile";
  export let isEditing = false;
  let initials: string | undefined = undefined;
  let profilePictureUrl: string | undefined = undefined;
  const Emojis: string[] = ["🚀", "😁", "✌️", "👓", "⭐️", "🔥", "⚽️", "🛵"];
  function pickRandomEmoji() {
    return Emojis[Math.floor(Math.random() * Emojis.length)];
  }
  onMount(async () => {
    await refresh($account);
    account.subscribe(async (x) => {
      await refresh(x);
    });
  });
  async function refresh(x: any) {
    if (isValidString(x.userInfo?.profilePictureUrl)) {
      try {
        let response = await fetch(x.userInfo?.profilePictureUrl!, {
          method: "GET"
        });
        logger.log({ context: "profilepic", response });
        if (response.status === 200) {
          profilePictureUrl = x.userInfo?.profilePictureUrl;
          return;
        }
      } catch (e) {
        logger.error({ context: "profilepic error", e });
      }
      // profilePictureUrl = x.userInfo?.profilePictureUrl;
      // return;
    }
    if (x.userInfo?.nickName) {
      initials =
        x.userInfo.nickName.charAt(0).toLocaleUpperCase() +
        x.userInfo.nickName.charAt(1).toLocaleUpperCase();
    } else {
      initials = pickRandomEmoji();
    }
  }
</script>

<button
  class={cn(" flex justify-center items-center bg-bgs3", {
    "rounded-full w-16 h-16": context === "cp-profile",
    "rounded-md w-20 h-20": context === "cmd-page",
    "rounded-full w-24 h-24 border-2": context === "account-settings",
    "border-transparent": context === "account-settings" && !isEditing,
    "outline-dashed outline-brs3 border-bgs1":
      context === "account-settings" && isEditing
  })}
>
  {#if initials}
    <div class="text-h3 text-fgs3">{initials}</div>
  {:else if profilePictureUrl}
    <img
      class={cn("w-full h-full", {
        "rounded-md": context === "cmd-page",
        "rounded-full": context === "cp-profile"
      })}
      src={$account.userInfo?.profilePictureUrl}
      alt="Profile picture"
    />
  {/if}
</button>
