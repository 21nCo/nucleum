<script lang="ts">
  import Button from "@21n/elements/button/Button.svelte";
  import Icon from "@21n/elements/Icon.svelte";
  import Popover from "@21n/elements/popover/Popover.svelte";
  import { ButtonStyle, ButtonVariant } from "@21n/types/button.type";
  import { Size } from "@21n/types/size.enum";
  import { createEventDispatcher } from "svelte";

  export let variant: "minimal" | "default" | "strong" = "default";

  const dispatch = createEventDispatcher();
  const options = [
    {
      label: "Add existing",
      icon: "arrow-arc-left",
      value: "addExisting"
    },
    {
      label: "Create new",
      icon: "plus",
      value: "createNew"
    }
    // {
    //   label: "Create multiple",
    //   icon: "rows-plus-bottom",
    //   value: "createMultiple",
    //   isDisabled: true,
    //   badge: "soon"
    // }
  ];
</script>

<Popover>
  {#if variant === "minimal"}
    <button
      class="flex rounded-full p-2 hover:bg-aps2 hover:border-aps1 bg-aps3 text-aps1 border border-aps2"
    >
      <Icon icon="plus" size={Size.sm} class="stroke-aps1" />
    </button>
  {:else}
    <Button
      icon="plus"
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
        class="flex items-center gap-2 px-3 py-2 hover:bg-bgs2 rounded-md text-fgs2"
        on:click={() => dispatch("add", option.value)}
      >
        <Icon icon={option.icon} size={Size.sm} />
        <span class="text-b2"> {option.label}</span>
      </button>
    {/each}
  </div>
</Popover>
