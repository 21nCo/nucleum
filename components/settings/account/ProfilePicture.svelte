<script lang="ts">
  import { userPreferences } from "$lib/tidy/stores/app.store";
  import account from "$lib/tidy/stores/account.store";
  import { isValidString } from "$lib/tidy/utils/text.utils";
  import { bgClass } from "$lib/tidy/utils/theme.utils";
  import { onMount } from "svelte";
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
        console.log("profilepic", { response });
        if (response.status === 200) {
          profilePictureUrl = x.userInfo?.profilePictureUrl;
          return;
        }
      } catch (e) {
        console.log("profilepic error", { e });
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

<div
  class="w-20 h-20 rounded-full flex justify-center items-center {bgClass(
    $userPreferences.theme,
    2
  )}"
>
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
