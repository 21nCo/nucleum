<script lang="ts">
  import account from "@nucleum/client/runtime/account/account.store";
  import { isValidString } from "@21n/shared-utils/text.utils";
  import { userPreferences } from "@nucleum/shared-state/preferences/user-preferences.store";
  import ProfilePicture from "@nucleum/surfaces/account/profile/ProfilePicture.svelte";
</script>

<div class="flex flex-col items-center gap-1">
  <ProfilePicture />
  <div class="text-b2">
    {isValidString($userPreferences.name) ||
      isValidString($account.userInfo?.nickName) ||
      "App user"}
  </div>
</div>
