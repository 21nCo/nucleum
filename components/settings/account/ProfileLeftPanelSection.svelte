<script lang="ts">
  import { account } from "$lib/tidy/stores/app.store";
  import ProfilePicture from "./ProfilePicture.svelte";
</script>

<div class="flex flex-col items-center gap-1">
  <ProfilePicture />
  <div class="text-b2">
    {$account.userInfo?.nickName || "App user"}
  </div>
</div>
