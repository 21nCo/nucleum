<script lang="ts">
  import account from "$lib/client/stores/account.store";
  import { isValidString } from "$lib/client/utils/text.utils";
  import { onMount } from "svelte";
  import { logger } from "$lib/client/stores/log.store";
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
        logger.logError({ context: "profilepic error", e });
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

<div class="w-20 h-20 rounded-full flex justify-center items-center bg-bgs3">
  {#if initials}
    <div class="text-h3 text-fgs3">{initials}</div>
  {:else if profilePictureUrl}
    <img
      class="w-full h-full rounded-full"
      src={$account.userInfo?.profilePictureUrl}
      alt="Profile picture"
    />
  {/if}
</div>
