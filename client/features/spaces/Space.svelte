<script lang="ts">
  import { page } from "$app/stores";
  import EmptyStatusView from "@21n/ui/elements/feedback/EmptyStatusView.svelte";
  import type { IRecordId } from "@nucleum/schema/legacy/data.type";
  import type { AccessMode } from "@nucleum/datafn/resource.type";
  import { navigation } from "@nucleum/shell/navigation/navigation";
  import { toasts } from "@nucleum/shared-state/notifications/notification.store";
  import {
    decodeSpaceSegment,
    resolveSpacePathSegments
  } from "@nucleum/client/config/space-route";
  import {
    formatFocusParam,
    parseFocusParam,
    sanitizeFocusPath
  } from "@nucleum/features/spaces/space.utils";
  import SpaceBody from "@nucleum/features/spaces/SpaceBody.svelte";

  let {
    id = undefined,
    accessMode = undefined,
    subPath = undefined,
    isFromSplitView = false
  }: {
    /** Space opened as a resource; absent on the `/space/<id>` page route. */
    id?: IRecordId;
    accessMode?: AccessMode;
    /** Segments after `/space` on the page route: the root id, then focused sub spaces. */
    subPath?: string[];
    isFromSplitView?: boolean;
  } = $props();

  const FOCUS_PARAM = "focus";
  const rootId = $derived(
    id
      ? id.toString()
      : subPath?.[0]
        ? decodeSpaceSegment(subPath[0])
        : undefined
  );
  const isRouted = $derived(!id);
  const focusParamKey = $derived(
    rootId
      ? navigation.resolveRecordSpecificSearchParam(rootId, FOCUS_PARAM)
      : undefined
  );
  const focusPath = $derived.by(() => {
    if (!rootId) return [];
    const raw = isRouted
      ? (subPath ?? [])
          .slice(1)
          .map(decodeSpaceSegment)
          .filter((value): value is string => Boolean(value))
      : parseFocusParam(
          focusParamKey ? $page.url.searchParams.get(focusParamKey) : null
        );
    return sanitizeFocusPath(rootId, raw);
  });
  const currentId = $derived(focusPath.at(-1) ?? rootId);
  const chain = $derived(rootId ? [rootId, ...focusPath] : []);
  const parentId = $derived(chain.length > 1 ? chain.at(-2) : undefined);

  function setFocusPath(path: string[]) {
    if (!rootId) return;
    if (isRouted) {
      navigation.replacePagePath(resolveSpacePathSegments(rootId, path));
      return;
    }
    navigation.toggleSearchParamRecordSpecific(rootId, {
      [FOCUS_PARAM]: formatFocusParam(path)
    });
  }

  function focusSpace(spaceId: string) {
    if (chain.includes(spaceId)) {
      toasts.error("This space is already open above");
      return;
    }
    setFocusPath([...focusPath, spaceId]);
  }

  function back() {
    setFocusPath(focusPath.slice(0, -1));
  }
</script>

{#if !rootId || !currentId}
  <EmptyStatusView
    mainText="No space selected"
    subText="Open a space from the library or the app menu"
    isSearchContext={false}
  />
{:else}
  {#key currentId}
    <SpaceBody
      spaceId={currentId}
      {parentId}
      ancestors={chain.slice(0, -1)}
      {accessMode}
      isEmbedded={isFromSplitView}
      onBack={back}
      onFocusSpace={focusSpace}
    />
  {/key}
{/if}
