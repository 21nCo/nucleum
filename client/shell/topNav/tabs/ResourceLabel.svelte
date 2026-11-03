<svelte:options runes={true} />

<script lang="ts">
  import { ResourceAccessPoint } from "@nucleum/datafn/resource.type";
  import Icon from "@21n/ui/elements/Icon.svelte";
  import { Size } from "@21n/ui/elements/size.enum";
  import { isValidString } from "@21n/shared-utils/text.utils";
  import { resolveResourceIcon } from "@nucleum/datafn/resource.utils";
  import {
    resolvePlainResourceLabel,
    resolveResourceTypeIcon,
    type LiveResource
  } from "@nucleum/shell/topNav/tabs/live-resource";

  let {
    source,
    fallbackIcon = undefined,
    isTypeIcon = false
  }: {
    /** Record or page action to label. */
    source: LiveResource;
    /** Icon shown when the record has no icon and no label renderer. */
    fallbackIcon?: string;
    /**
     * Shows the resource type icon, or the shared page icon for generic
     * pages, with a plain label instead of the resource's own renderer.
     */
    isTypeIcon?: boolean;
  } = $props();

  const resource = $derived(source.resource);
  const action = $derived(source.action);
  const icon = $derived(resource?.icon ?? fallbackIcon);
</script>

{#if !resource && source.isResolved}
  <span class="truncate text-fgs3">Not found</span>
{:else if !resource}
  <span class="block h-3 w-28 rounded bg-bgs3 animate-pulse" aria-hidden="true"
  ></span>
{:else if isTypeIcon}
  <span class="flex items-center gap-1.5 min-w-0">
    <Icon
      icon={resolveResourceTypeIcon(source, resolveResourceIcon)}
      size={Size.sm}
      class="shrink-0"
    />
    <span class="truncate">{resolvePlainResourceLabel(resource)}</span>
  </span>
{:else if action?.resourceLabelRenderer}
  {@const ResourceLabelRenderer = action.resourceLabelRenderer}
  <ResourceLabelRenderer
    item={resource}
    accessPoint={ResourceAccessPoint.TABS}
    isShowFallbackIcons={true}
  />
{:else}
  <span class="flex items-center gap-1 min-w-0">
    {#if icon}
      <Icon {icon} size={Size.sm} />
    {/if}
    <span class="truncate"
      >{isValidString(resource?.label) ? resource?.label : "Untitled"}</span
    >
  </span>
{/if}
