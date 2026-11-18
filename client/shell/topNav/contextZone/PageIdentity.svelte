<svelte:options runes={true} />

<script lang="ts">
  import type { Snippet } from "svelte";
  import Icon from "@21n/ui/elements/Icon.svelte";
  import { Size } from "@21n/ui/elements/size.enum";
  import { tooltip } from "@21n/ui/actions/popover.action";
  import { cn } from "@21n/ui/environment/presentation";
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

  /** Narrowest width a truncating title shrinks to, in rem. */
  const TITLE_MIN_WIDTH_REM = 8;
  let identityRef = $state<HTMLDivElement | undefined>(undefined);
  /**
   * Whether the identity is wider than the title minimum at its natural width.
   * A shorter identity keeps its natural width; a longer one truncates down to
   * the minimum before the controls give up space.
   */
  let isLong = $state(false);

  /**
   * Width the identity takes when nothing constrains it: up to the end of its
   * content, which does not grow, plus any title text cut off by truncation.
   * Its own box is not used, since the title minimum can keep it wider than
   * its content.
   */
  function measureNaturalWidth(element: HTMLElement): number {
    const last = element.lastElementChild;
    if (!last) return 0;
    const hidden = [
      ...element.querySelectorAll<HTMLElement>(".truncate")
    ].reduce(
      (total, node) => total + Math.max(0, node.scrollWidth - node.clientWidth),
      0
    );
    const paddingRight =
      parseFloat(getComputedStyle(element).paddingRight) || 0;
    return (
      last.getBoundingClientRect().right -
      element.getBoundingClientRect().left +
      paddingRight +
      hidden
    );
  }

  function measure() {
    if (!identityRef) return;
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
    isLong =
      measureNaturalWidth(identityRef) > TITLE_MIN_WIDTH_REM * (rem || 16);
  }

  /**
   * Re-measures when the identity resizes or its content changes. A new title
   * can leave the identity at the same width (such as at the title minimum),
   * which the resize observer alone does not report.
   */
  $effect(() => {
    if (!identityRef) return;
    const resizeObserver = new ResizeObserver(() => measure());
    resizeObserver.observe(identityRef);
    const mutationObserver = new MutationObserver(() => measure());
    mutationObserver.observe(identityRef, {
      childList: true,
      subtree: true,
      characterData: true
    });
    measure();
    return () => {
      resizeObserver.disconnect();
      mutationObserver.disconnect();
    };
  });
</script>

{#if (live && !isMissing) || pageAction}
  <!--
    A long identity's shrink factor is large enough that it takes all of the
    shrinking until it reaches the title minimum; only then do the controls
    beside it give up space.
  -->
  <div
    bind:this={identityRef}
    class={cn("flex items-center h-full max-w-[24rem] pl-2 pr-1 gap-1", {
      "min-w-[8rem] shrink-[1000]": isLong,
      "min-w-0 shrink-0": !isLong
    })}
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
