<script lang="ts">
  import { account, userPreferences } from "$lib/tidy/stores/app.store";
  import { bgClass } from "$lib/tidy/utils/theme.utils";
  import { onMount } from "svelte";
  let initials: string | undefined = undefined;
  const Emojis: string[] = ["🚀", "😁", "✌️", "👓", "⭐️", "🔥", "⚽️", "🛵"];
  function pickRandomEmoji() {
    return Emojis[Math.floor(Math.random() * Emojis.length)];
  }
  onMount(() => {
    account.subscribe((x) => {
      if (x.userInfo?.profilePicture) {
        //todo - retrieve profile picture from cloud
      } else if (x.userInfo?.nickName) {
        initials =
          x.userInfo.nickName.charAt(0).toLocaleUpperCase() +
          x.userInfo.nickName.charAt(1).toLocaleUpperCase();
      } else {
        initials = pickRandomEmoji();
      }
    });
  });
</script>

<div
  class="w-20 h-20 rounded-full flex justify-center items-center {bgClass(
    $userPreferences.theme,
    2
  )}"
>
  {#if initials}
    <div class="text-h3 text-fgs3">{initials}</div>
  {:else}
    <!-- profile picture -->
  {/if}
</div>
