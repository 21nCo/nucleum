<script>
  import Divider from "$lib/client/elements/Divider.svelte";
  import ComponentResolver from "$lib/client/layout/paint/ComponentResolver.svelte";
  import account from "$lib/client/stores/account.store";
  import { currentTime } from "$lib/client/stores/app.store";
  import { userPreferences } from "$lib/client/components/settings/userPreferences.store";
  import view from "$lib/client/stores/view.store";
  import { Action } from "$lib/client/types/action.enum";
  import { ColorStrength } from "$lib/client/types/appearance.type";
  import { Orientation } from "$lib/client/types/direction.enum";
  import { Display } from "$lib/client/types/view.type";
  import { formatDatetime } from "$lib/client/utils/time.utils";
  import { renderMdAsHtml } from "../markdown/markdown.utils";
  import { player } from "../modal/modal.store";
  import ProfilePicture from "../settings/account/ProfilePicture.svelte";
  import CommandBar from "./CommandBar.svelte";
</script>

<div class="flex flex-col w-full h-full">
  <div
    class="flex flex-col dp:flex-row gap-6 w-full h-11/12 justify-center items-center p-4 tp:p-8 dp:p-16"
  >
    <div class="dp:w-1/2 dp:h-full flex flex-col gap-6 dp:justify-center">
      <ProfilePicture context="cmd-page" />
      <div class="flex flex-col gap-1">
        <div class="text-xl text-fgs2">
          Hi {$account.userInfo?.nickName}!
        </div>
        <div class="text-fgs3">
          {formatDatetime($userPreferences, $currentTime)}
        </div>
      </div>
      {#if $player.isMiniOn}
        <Divider />
        <ComponentResolver path={$player.action + Action.CMD} />
      {/if}
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
      <div class="h-full w-full dp:h-2/3 dp:w-full flex items-center">
        <CommandBar isFullPageContext={true} />
      </div>
    </div>
  </div>
  <footer class="w-full flex justify-center h-1/12 text-fgs2 text-b2">
    <span>
      {@html renderMdAsHtml(
        "Command only mode is in **beta**. Please report any issues you encounter using *Chat with us* command."
      )}
    </span>
  </footer>
</div>
