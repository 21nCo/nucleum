<script lang="ts">
  import account from "$lib/client/stores/account.store";
  import { isValidString } from "$lib/shared/utils/text.utils";
  import { userPreferences } from "../userPreferences.store";
  import ProfilePicture from "./ProfilePicture.svelte";
</script>

<div class="flex flex-col items-center gap-1">
  <ProfilePicture />
  <div class="text-b2">
    {isValidString($userPreferences.name) ||
      isValidString($account.userInfo?.nickName) ||
      "App user"}
  </div>
</div>
