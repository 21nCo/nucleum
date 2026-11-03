<svelte:options runes={true} />

<script lang="ts">
  import Icon from "@21n/ui/elements/Icon.svelte";
  import { Size } from "@21n/ui/elements/size.enum";
  import { tooltip } from "@21n/ui/actions/popover.action";
  import { isValidString } from "@21n/shared-utils/text.utils";
  import { resolveResourceIcon } from "@nucleum/datafn/resource.utils";
  import { appStore } from "@nucleum/shared-state/app-context/app.store";
  import { resolvePageRoute } from "@nucleum/shared-state/commands/page-view-actions";
  import { liveResource } from "@nucleum/shell/topNav/tabs/live-resource";
  import ResourceLabel from "@nucleum/shell/topNav/tabs/ResourceLabel.svelte";
  import {
    resolveIdentityTypeLine,
    type ContextZoneSubject
  } from "@nucleum/shell/topNav/contextZone/context-zone-subject";

  let {
    subject,
    backId = undefined,
    location = undefined,
    isTwoLine = false,
    onBack = undefined
  }: {
    /** Record or page path the visible page shows. */
    subject: ContextZoneSubject;
    /** Record the page was opened from; shows a back button to it. */
    backId?: string;
    /** Where the record is open, such as the page it covers. */
    location?: string;
    /** Shows the type and location line above a record's title. */
    isTwoLine?: boolean;
    onBack?: () => void;
  } = $props();

  const subjectId = $derived(
    subject.kind === "resource" ? subject.id : undefined
  );
  const subjectPath = $derived(
    subject.kind === "path" ? subject.path : undefined
  );
  const live = $derived(subjectId ? liveResource(subjectId) : undefined);
  const parent = $derived(backId ? liveResource(backId) : undefined);
  const pageAction = $derived(
    subjectPath
      ? resolvePageRoute($appStore.actions, subjectPath)?.action
      : undefined
  );
  const isMissing = $derived(!!$live?.isResolved && !$live.resource);
  const title = $derived(
    live
      ? isValidString($live?.resource?.label)
        ? ($live?.resource?.label as string)
        : $live?.resource
          ? "Untitled"
          : ""
      : (pageAction?.label ?? "")
  );
  const typeLine = $derived(
    $live ? resolveIdentityTypeLine($live.resourceType, location) : ""
  );
  const parentTitle = $derived(
    isValidString($parent?.resource?.label)
      ? ($parent?.resource?.label as string)
      : "Untitled"
  );
</script>

{#if (live && !isMissing) || pageAction}
  <div
    class="flex items-center h-full min-w-0 max-w-[24rem] shrink-0 pl-2 pr-1 gap-1"
    data-testid="top-bar-page-identity"
  >
    {#if parent && onBack}
      {#key parentTitle}
        <button
          type="button"
          data-testid="top-bar-back"
          aria-label={`Back to ${parentTitle}`}
          class="flex items-center justify-center h-8 w-8 shrink-0 rounded-md text-fgs2 hover:bg-bgs3 hover:text-fgs1"
          use:tooltip={{ text: `Back to ${parentTitle}` }}
          onclick={onBack}
        >
          <Icon icon="chevron-left" size={Size.md} />
        </button>
      {/key}
    {/if}
    {#key title}
      <div
        class="flex flex-col justify-center min-w-0 px-1 gap-0.5"
        data-testid="top-bar-page-title"
        use:tooltip={{ text: title }}
      >
        {#if live && isTwoLine && typeLine}
          <span
            class="truncate text-b4 leading-none text-fgs3"
            data-testid="top-bar-page-type">{typeLine}</span
          >
        {/if}
        <span class="flex items-center min-w-0 text-b2 font-medium text-fgs1">
          {#if live}
            <span class="truncate min-w-0">
              <ResourceLabel
                source={$live!}
                fallbackIcon={resolveResourceIcon($live!.resourceType)}
              />
            </span>
          {:else if pageAction}
            <span class="truncate">{pageAction.label}</span>
          {/if}
        </span>
      </div>
    {/key}
  </div>
{/if}
