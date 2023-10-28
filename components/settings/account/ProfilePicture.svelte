<script lang="ts">
  import { account, userPreferences } from "$lib/tidy/stores/app.store";
  import { bg } from "$lib/tidy/utils/theme.utils";
  import { onMount } from "svelte";
  let initials: string | undefined = undefined;
  onMount(() => {
    account.subscribe((x) => {
      if (x.userInfo?.profilePicture) {
        //todo - retrieve profile picture from cloud
      } else if (x.userInfo?.firstName && x.userInfo?.lastName) {
        initials =
          x.userInfo.firstName.charAt(0) + x.userInfo.lastName.charAt(0);
      }
    });
  });
</script>

<div
  class="w-20 h-20 rounded-full flex justify-center items-center {bg(
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
