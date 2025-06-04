<script lang="ts">
  import account from "$lib/client/stores/account.store";
  import { isValidString } from "$lib/shared/utils/text.utils";
  import { onMount } from "svelte";
  import { logger } from "$lib/client/components/debug/logger.client";
  import { cn } from "$lib/client/utils/ui.utils";
  import Icon from "$lib/client/elements/Icon.svelte";
  import FileView from "../../files/FileView.svelte";
  import type { IRecordId } from "$lib/client/types/data.type";
  import { userPreferences } from "../userPreferences.store";
  import { appStore } from "$lib/client/stores/app.store";
  import { Product } from "$lib/client/types/product.type";
  export let context:
    | "cmd-page"
    | "cp-profile"
    | "account-settings"
    | "topbar" = "cp-profile";
  export let fileId: IRecordId | undefined = undefined;
  export let isEditing = false;
  export let isLoading = false;
  let initials: string | undefined = undefined;
  let profilePictureUrl: string | undefined = undefined;
  const Emojis: string[] = ["🚀", "😁", "✌️", "👓", "⭐️", "🔥", "⚽️", "🛵"];

  function pickRandomEmoji() {
    return Emojis[Math.floor(Math.random() * Emojis.length)];
  }

  $: renderFileBasedProfilePicture =
    $appStore.product === Product.MEMOTRON ||
    $appStore.product === Product.NUCLEUS;

  onMount(async () => {
    await refresh($account);
    const unsubscribeAccount = account.subscribe(async (x) => {
      await refresh(x);
    });
    const unsubscribeUserPreferences = userPreferences.subscribe((x) => {
      if (x.profilePicture) fileId = x.profilePicture ?? fileId;
    });
    return () => {
      if (unsubscribeAccount) unsubscribeAccount();
      if (unsubscribeUserPreferences) unsubscribeUserPreferences();
    };
  });

  async function refresh(x: any) {
    if (fileId && renderFileBasedProfilePicture) return;
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
    "rounded-full w-7 h-7 lp:w-6 lp:h-6": context === "topbar",
    "rounded-full w-16 h-16": context === "cp-profile",
    "rounded-md w-20 h-20": context === "cmd-page",
    "rounded-md w-full border-4": context === "account-settings",
    "border-transparent": context === "account-settings" && !isEditing,
    "outline-2 outline-dashed outline-fgs3 border-bgs1":
      context === "account-settings" && isEditing
  })}
>
  {#if isLoading}
    <Icon icon="svg-spinners:90-ring-with-bg" />
  {:else if fileId && renderFileBasedProfilePicture}
    <FileView
      id={fileId}
      isLazyLoad={false}
      class={cn("object-cover w-full h-full", {
        "rounded-md": context === "cmd-page" || context === "account-settings",
        "rounded-full": context === "cp-profile" || context === "topbar"
      })}
    />
  {:else if initials}
    <div
      class={cn("text-fgs3 min-h-24 flex items-center justify-center", {
        "text-h3": context !== "topbar",
        "text-b2": context === "topbar"
      })}
    >
      {initials}
    </div>
  {:else if profilePictureUrl}
    <img
      class={cn("w-full h-full", {
        "rounded-md": context === "cmd-page",
        "rounded-full":
          context === "cp-profile" || context === "account-settings"
      })}
      src={$account.userInfo?.profilePictureUrl}
      alt="Profile"
    />
  {/if}
</button>
