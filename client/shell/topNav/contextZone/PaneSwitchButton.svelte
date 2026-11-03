<svelte:options runes={true} />

<script lang="ts">
  import Icon from "@21n/ui/elements/Icon.svelte";
  import { Size } from "@21n/ui/elements/size.enum";
  import { resolveResourceIcon } from "@nucleum/datafn/resource.utils";
  import { appStore } from "@nucleum/shared-state/app-context/app.store";
  import { resolvePageRoute } from "@nucleum/shared-state/commands/page-view-actions";
  import {
    liveResource,
    resolvePlainResourceLabel
  } from "@nucleum/shell/topNav/tabs/live-resource";
  import type { ContextZoneSubject } from "@nucleum/shell/topNav/contextZone/context-zone-subject";

  let {
    subject,
    onFocus
  }: {
    /** Record or page shown in the pane this button focuses. */
    subject: ContextZoneSubject;
    onFocus: () => void;
  } = $props();

  const subjectId = $derived(
    subject.kind === "resource" ? subject.id : undefined
  );
  const subjectPath = $derived(
    subject.kind === "path" ? subject.path : undefined
  );
  const live = $derived(subjectId ? liveResource(subjectId) : undefined);
  const route = $derived(
    subjectPath ? resolvePageRoute($appStore.actions, subjectPath) : undefined
  );
  const label = $derived(
    live
      ? $live?.resource
        ? resolvePlainResourceLabel($live.resource)
        : $live?.isResolved
          ? "Not found"
          : ""
      : [route?.action.label, ...(route?.subPath ?? []).slice(0, 1)]
          .filter(Boolean)
          .map((part) => part!.charAt(0).toUpperCase() + part!.slice(1))
          .join(" · ")
  );
  const icon = $derived(
    $live ? resolveResourceIcon($live.resourceType) : route?.action.icon
  );
</script>

{#if label}
  <button
    type="button"
    class="flex items-center gap-2 h-full min-w-0 max-w-[16rem] shrink px-4 text-b2 text-fgs2 hover:bg-bgs3 hover:text-fgs1 app-framed:h-10 app-framed:self-center app-framed:rounded-[var(--app-control-radius)]"
    aria-label={`Focus pane: ${label}`}
    data-testid="top-bar-pane-switch"
    onclick={onFocus}
  >
    {#if icon}
      <Icon {icon} size={Size.sm} class="shrink-0" />
    {/if}
    <span class="truncate">{label}</span>
  </button>
{/if}
