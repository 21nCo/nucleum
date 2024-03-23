<script lang="ts">
  import account from "$lib/tidy/stores/account.store";
  import { isValidString } from "$lib/tidy/utils/text.utils";
  import { onMount } from "svelte";
  import BackgroundElement from "$lib/tidy/elements/style/BackgroundElement.svelte";
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

<BackgroundElement
  classList="w-20 h-20 rounded-full flex justify-center items-center"
  parentBgIndex={2}
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
</BackgroundElement>
