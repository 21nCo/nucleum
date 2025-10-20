<script lang="ts">
  import { abg, cn } from "@21n/utils/ui.utils";
  import Icon from "@21n/elements/Icon.svelte";
  import { createEventDispatcher } from "svelte";
  import { Size } from "@21n/types/size.enum";
  import Toggle from "@21n/elements/toggle/Toggle.svelte";
  import Tag from "@21n/elements/text/Tag.svelte";
  const dispatch = createEventDispatcher();
  export let links: string[];
  export let isLinkboxOpened: boolean = false;
</script>

<!-- <button
  class={cn(
    "flex gap-1 items-center justify-center px-2 py-1 rounded-md text-b3",
    abg(isLinkboxOpened),
    {
      "bg-bgs3 border border-transparent hover:border-brs3": !isLinkboxOpened
    }
  )}
  on:click|stopPropagation={() => {
    isLinkboxOpened = !isLinkboxOpened;
    dispatch("change", isLinkboxOpened);
  }}
>
  <Icon
    icon={isLinkboxOpened ? "ph:link" : "ph:link-light"}
    isAccentBgContext={isLinkboxOpened}
    size={Size.sm}
  />
  <span> Link </span>
  {#if links?.length > 0}
    <span
      class={cn(
        "flex items-center justify-center text-fgs2 text-b4 rounded-full h-4 w-4",
        {
          "bg-bgs3": !isLinkboxOpened,
          "bg-aps2": isLinkboxOpened
        }
      )}
    >
      {links.length}
    </span>
  {/if}
</button> -->
<Tag
  label="Links"
  icon="link"
  isActive={isLinkboxOpened}
  count={links?.length ?? 0}
  isShowExpandFeedbackOnActive={true}
  isRemovable={false}
  on:click={() => (isLinkboxOpened = !isLinkboxOpened)}
/>
