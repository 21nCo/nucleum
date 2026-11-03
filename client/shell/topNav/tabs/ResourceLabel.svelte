<svelte:options runes={true} />

<script lang="ts">
  import { ResourceAccessPoint } from "@nucleum/datafn/resource.type";
  import Icon from "@21n/ui/elements/Icon.svelte";
  import { Size } from "@21n/ui/elements/size.enum";
  import { isValidString } from "@21n/shared-utils/text.utils";
  import type { LiveResource } from "@nucleum/shell/topNav/tabs/live-resource";

  let {
    source,
    fallbackIcon = undefined
  }: {
    /** Record or page action to label. */
    source: LiveResource;
    /** Icon shown when the record has no icon and no label renderer. */
    fallbackIcon?: string;
  } = $props();

  const resource = $derived(source.resource);
  const action = $derived(source.action);
  const icon = $derived(resource?.icon ?? fallbackIcon);
</script>

{#if !resource && !source.isResolved}
  <span class="block h-3 w-28 rounded bg-bgs3 animate-pulse" aria-hidden="true"
  ></span>
{:else if action?.resourceLabelRenderer && resource}
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
