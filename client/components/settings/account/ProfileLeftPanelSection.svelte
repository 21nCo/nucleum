<script lang="ts">
  import account from "@21n/stores/account.store";
  import { isValidString } from "@21n/shared-utils/text.utils";
  import { userPreferences } from "@21n/components/settings/userPreferences.store";
  import ProfilePicture from "@21n/components/settings/account/ProfilePicture.svelte";
</script>

<div class="flex flex-col items-center gap-1">
  <ProfilePicture />
  <div class="text-b2">
    {isValidString($userPreferences.name) ||
      isValidString($account.userInfo?.nickName) ||
      "App user"}
  </div>
</div>
