<script>
  import Divider from "$lib/client/elements/Divider.svelte";
  import account from "$lib/client/stores/account.store";
  import { currentTime, userPreferences } from "$lib/client/stores/app.store";
  import view from "$lib/client/stores/view.store";
  import { ColorStrength } from "$lib/client/types/appearance.type";
  import { Orientation } from "$lib/client/types/direction.enum";
  import { Display } from "$lib/client/types/view.type";
  import { formatDatetime } from "$lib/client/utils/time.utils";
  import ProfilePicture from "../settings/account/ProfilePicture.svelte";
  import CommandBar from "./CommandBar.svelte";
</script>

<div
  class="flex flex-col dp:flex-row gap-6 w-full h-full justify-center items-center p-4 tp:p-8 dp:p-16"
>
  <div class="dp:w-1/2 dp:h-full flex flex-col dp:justify-center">
    <ProfilePicture context="cmd-page" />
    <div class="text-xl text-fgs2">
      Hi {$account.userInfo?.nickName}!
    </div>
    <div class="text-fgs3">
      {formatDatetime($userPreferences, $currentTime)}
    </div>
  </div>
  {#if $view.display === Display.DP}
    <Divider
      orientation={Orientation.Vertical}
      colorStrength={ColorStrength.Strong}
    />
  {/if}
  <div
    class="h-96 w-[40rem] dp:h-full dp:w-1/2 flex justify-center items-center"
  >
    <div class="h-full w-full dp:h-2/3 dp:w-full">
      <CommandBar isFullPageContext={true} />
    </div>
  </div>
</div>
