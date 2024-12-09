<script lang="ts">
  import Button from "$lib/client/elements/button/Button.svelte";
  import Icon from "$lib/client/elements/Icon.svelte";
  import Popover from "$lib/client/elements/popover/Popover.svelte";
  import { ButtonStyle, ButtonVariant } from "$lib/client/types/button.type";
  import { Size } from "$lib/client/types/size.enum";
  import { createEventDispatcher } from "svelte";

  export let variant: "minimal" | "default" | "strong" = "default";

  const dispatch = createEventDispatcher();
  const options = [
    {
      label: "Add existing",
      icon: "ph:arrow-arc-left-thin",
      value: "addExisting"
    },
    {
      label: "Create new",
      icon: "ph:plus-thin",
      value: "createNew"
    }
    // {
    //   label: "Create multiple",
    //   icon: "ph:rows-plus-bottom-thin",
    //   value: "createMultiple",
    //   isDisabled: true,
    //   badge: "soon"
    // }
  ];
</script>

<Popover>
  {#if variant === "minimal"}
    <button
      class="flex rounded-full p-1 hover:bg-aps2 hover:border-aps1 bg-aps3 text-aps1 border border-aps2"
    >
      <Icon icon="ph:plus-thin" size={Size.sm} class="stroke-aps1" />
    </button>
  {:else}
    <Button
      icon="ph:plus-thin"
      label="Add"
      size={Size.sm}
      type={ButtonVariant.PRIMARY}
      style={variant === "default" ? ButtonStyle.OUTLINED : ButtonStyle.DEFAULT}
      isPreventMinWidth={true}
    />
  {/if}

  <div slot="popover" class="flex flex-col px-2 py-2 w-48">
    {#each options as option}
      <button
        class="flex gap-2 px-3 py-2 hover:bg-bgs2 rounded-md text-fgs2"
        on:click={() => dispatch("add", option.value)}
      >
        <Icon icon={option.icon} size={Size.sm} />
        <span class="text-b2"> {option.label}</span>
      </button>
    {/each}
  </div>
</Popover>
