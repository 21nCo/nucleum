<svelte:options runes={true} />

<script lang="ts">
  import type { Snippet } from "svelte";
  import Icon from "@21n/ui/elements/Icon.svelte";
  import { Size } from "@21n/ui/elements/size.enum";
  import { tooltip } from "@21n/ui/actions/popover.action";
  import { isValidString } from "@21n/shared-utils/text.utils";
  import { resolveResourceIcon } from "@nucleum/datafn/resource.utils";
  import { appStore } from "@nucleum/shared-state/app-context/app.store";
  import { resolvePageRoute } from "@nucleum/shared-state/commands/page-view-actions";
  import { liveResource } from "@nucleum/shell/topNav/tabs/live-resource";
  import ResourceLabel from "@nucleum/shell/topNav/tabs/ResourceLabel.svelte";
  import type { ContextZoneSubject } from "@nucleum/shell/topNav/contextZone/context-zone-subject";

  let {
    subject,
    backId = undefined,
    titleContent = undefined,
    onBack = undefined
  }: {
    /** Record or page path the visible page shows. */
    subject: ContextZoneSubject;
    /** Record the page was opened from; shows a back button to it. */
    backId?: string;
    /** Renders in place of the title, such as an editable title. */
    titleContent?: Snippet;
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
  const parentTitle = $derived(
    isValidString($parent?.resource?.label)
      ? ($parent?.resource?.label as string)
      : $parent?.resource
        ? "Untitled"
        : ""
  );
  const backLabel = $derived(parentTitle ? `Back to ${parentTitle}` : "Back");
</script>

{#if (live && !isMissing) || pageAction}
  <div
    class="flex items-center h-full min-w-[8rem] max-w-[24rem] shrink-[4] pl-2 pr-1 gap-1"
    data-testid="top-bar-page-identity"
  >
    {#if parent && onBack}
      {#key backLabel}
        <button
          type="button"
          data-testid="top-bar-back"
          aria-label={backLabel}
          class="flex items-center justify-center h-8 w-8 shrink-0 rounded-md text-fgs2 hover:bg-bgs3 hover:text-fgs1 app-framed:h-10 app-framed:w-10 app-framed:rounded-[var(--app-control-radius)]"
          use:tooltip={{ text: backLabel, isPlainText: true }}
          onclick={onBack}
        >
          <Icon icon="chevron-left" size={Size.md} />
        </button>
      {/key}
    {/if}
    {#if titleContent}
      <div
        class="flex items-center min-w-0 px-1 text-base font-medium text-fgs1 app-framed:text-h3 app-framed:px-2"
        data-testid="top-bar-page-title"
      >
        {@render titleContent()}
      </div>
    {:else}
      {#key title}
        <div
          class="flex items-center min-w-0 px-1"
          data-testid="top-bar-page-title"
          use:tooltip={{ text: title, isPlainText: true }}
        >
          <span
            class="flex items-center min-w-0 text-base font-medium text-fgs1 app-framed:text-h3"
          >
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
    {/if}
  </div>
{/if}
