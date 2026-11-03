<script lang="ts">
  import Icon from "@21n/ui/elements/Icon.svelte";
  import AvatarRenderer from "@21n/ui/elements/avatarPicker/AvatarRenderer.svelte";
  import type { IAvatar } from "@21n/ui/elements/avatarPicker/avatar.type";
  import { Size } from "@21n/ui/elements/size.enum";
  import { Resource } from "@nucleum/datafn/resource.enum";
  import { resolveResourceIcon } from "@nucleum/datafn/resource.utils";
  import SpaceHeadingTree from "@nucleum/features/spaces/SpaceHeadingTree.svelte";

  let {
    nodeId,
    label,
    avatar = undefined,
    onOpen,
    onOpenHeading
  }: {
    nodeId: string;
    label: string;
    avatar?: IAvatar;
    onOpen: () => void;
    onOpenHeading: (headingId: string) => void;
  } = $props();
</script>

<div
  class="group/page-card relative flex flex-col w-full h-[15.2rem] rounded-md border border-brs2 notouch:hover:border-brs4"
  data-testid="space-wall-page-card"
>
  <button
    type="button"
    class="absolute inset-0 rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-aps1"
    aria-label={`Open ${label}`}
    data-testid="space-wall-page-open"
    onclick={onOpen}
  ></button>
  <div
    class="relative flex-1 min-h-0 overflow-auto px-1 py-2 pointer-events-none"
  >
    <p class="px-2 pb-1 text-b4 text-fgs3">Contents</p>
    <div class="pointer-events-auto">
      <SpaceHeadingTree
        {nodeId}
        depth={1}
        maxLevels={2}
        isCompact={true}
        onSelect={onOpenHeading}
      />
    </div>
  </div>
  <div
    class="relative flex items-center gap-2 px-3 py-2 border-t border-brs2 rounded-b-md bg-bgs2 pointer-events-none"
  >
    <span class="flex w-5 h-5 shrink-0 items-center justify-center">
      {#if avatar}
        <AvatarRenderer {avatar} size={Size.sm} />
      {:else}
        <Icon
          icon={resolveResourceIcon(Resource.node)}
          size={Size.sm}
          class="stroke-fgs2"
        />
      {/if}
    </span>
    <span class="truncate text-b2 font-medium">{label}</span>
  </div>
</div>
