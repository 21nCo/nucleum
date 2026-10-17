<svelte:options runes={true} />

<script lang="ts">
  import type { Snippet } from "svelte";
  import TopNav from "@nucleum/shell/topNav/TopNav.svelte";
  import TopNavLeftLogo from "@nucleum/shell/topNav/TopNavLeftLogo.svelte";
  import SubAtomLogo from "@nucleum/composition/SubAtomLogo.svelte";
  import ProfilePicture from "@nucleum/surfaces/account/profile/ProfilePicture.svelte";
  import OfflineStatusIndicator from "@nucleum/surfaces/settings/sync/OfflineStatusIndicator.svelte";
  import BulkEditBar from "@nucleum/surfaces/library/bulk-edit/BulkEditBar.svelte";
  import SearchInput from "@nucleum/surfaces/search/SearchInput.svelte";
  import { searchStore } from "@nucleum/surfaces/search/search.store";
  import account from "@nucleum/client/runtime/account/account.store";
  import { UserDataMode } from "@nucleum/client/runtime/account/account.type";
  import { determineIfActiveSubscriber } from "@nucleum/client/runtime/account/plan.utils";
  import { Action } from "@nucleum/client/config/action.enum";
  import { Size } from "@21n/ui/elements/size.enum";
  import type { InputStyle } from "@21n/ui/elements/input/input.type";

  let { topnav = undefined }: { topnav?: Snippet } = $props();
  const isSubscriber = $derived(
    $account?.plan && $account?.dataMode === UserDataMode.CLOUD
      ? determineIfActiveSubscriber($account.plan)
      : false
  );
</script>

{#snippet subAtomLogo()}
  <SubAtomLogo size={Size.sm} />
{/snippet}
{#snippet profilePicture(
  context: "cmd-page" | "cp-profile" | "account-settings" | "topbar" | "mobile-topbar"
)}
  <ProfilePicture {context} />
{/snippet}
{#snippet leftLogo()}
  <TopNavLeftLogo
    action={Action.SETTINGS}
    logo={subAtomLogo}
    {profilePicture}
    {isSubscriber}
  />
{/snippet}
{#snippet searchInput({
  style,
  isAutoFocus
}: {
  style: InputStyle;
  isAutoFocus: boolean;
})}
  <SearchInput {style} {isAutoFocus} />
{/snippet}
{#snippet bulkEditBar({
  count,
  context,
  subContext,
  onAction,
  onSelectAll,
  onClear
}: {
  count: number;
  context: any;
  subContext?: string;
  onAction: (detail: { action: string; data?: any }) => void;
  onSelectAll: () => void;
  onClear: () => void;
})}
  <BulkEditBar
    {count}
    {context}
    {subContext}
    {onAction}
    {onSelectAll}
    {onClear}
  />
{/snippet}
{#snippet offlineStatus({ isIconOnly }: { isIconOnly?: boolean })}
  <OfflineStatusIndicator {isIconOnly} />
{/snippet}

<TopNav
  {topnav}
  {leftLogo}
  {searchInput}
  {bulkEditBar}
  {offlineStatus}
  onCloseSearch={() => searchStore.reset()}
/>
