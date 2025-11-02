<script lang="ts">
  import { cn } from "@21n/utils/ui.utils";
  import { Size } from "@21n/types/size.enum";
  import SubAtomLogo from "@21n/branding/SubAtomLogo.svelte";
  import ProfilePicture from "@21n/components/settings/account/ProfilePicture.svelte";
  import { appStore } from "@21n/stores/app.store";
  import { tooltip } from "@21n/actions/popover.action";
  import { determineIfActiveSubscriber } from "@21n/components/subscription/userPlan.utils";
  import { UserDataMode } from "@21n/types/account.type";
  import account from "@21n/stores/account.store";
  import { Action } from "@21n/types/action.enum";

  export let isHideMenuLabels: boolean = false;
  export let isRenderProfilePicture: boolean = false;

  $: isSubscriber =
    $account?.plan && $account?.dataMode === UserDataMode.CLOUD
      ? determineIfActiveSubscriber($account.plan)
      : false;
</script>

<button
  class={cn(
    "group flex items-center h-full w-fit border-r border-brs3 hover:bg-bgs3-striped",
    {
      "px-[0.72rem]": isHideMenuLabels,
      "px-[1.72rem]": !isHideMenuLabels
    }
  )}
  on:click={() => appStore.runAction(Action.SETTINGS)}
>
  {#if isRenderProfilePicture}
    <div class="px-1">
      <div
        class={cn("flex items-center gap-2 rounded-full overflow-hidden", {
          "outline outline-ags1 group-hover:brightness-110": isSubscriber,
          "hover:outline group-hover:outline-brs3": !isSubscriber
        })}
        use:tooltip={{
          text: "Account & settings"
        }}
      >
        <ProfilePicture context="topbar" />
      </div>
    </div>
  {:else}
    <div class="opacity-50">
      <SubAtomLogo size={Size.sm} />
    </div>
  {/if}
</button>
