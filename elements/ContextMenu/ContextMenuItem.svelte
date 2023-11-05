<script lang="ts">
  import type { DynamicIconProp } from "$lib/local/types/dynamicIconProp.type";
  import type { ClassListProp } from "$lib/tidy/types/classListProp.type";
  import { SvelteComponent, createEventDispatcher, onMount } from "svelte";
  import Icon from "../Icon.svelte";
  import Pop from "../Pop.svelte";
  import { Size } from "$lib/tidy/types/size.enum";
  import Button from "../Button.svelte";
  import { windowObject } from "$lib/tidy/stores/app.store";

  export let style: string = "";
  export let classList: ClassListProp | null = null;

  export let label: string = "";
  export let icon: DynamicIconProp | null = null;
  export let isActive: boolean = false;

  // export let isModalConfirmation: boolean = false; //this variable is responsible for confirming that modal will be needed as confirmation, so when the user clicks on the item, the modal will be visible if this variable is true
  // export let modalConfirmationMessage: string = ""; // this variable is responsible for the message that will be displayed in the modal

  // export let isModalVisible: boolean = false; // this variable is to identify whether the modal will be visible or not,

  const dispatch = createEventDispatcher();

  function handleClick() {
    dispatch("click");
  }

  // function toggleModalVisibility(value?: boolean) {
  //   isModalVisible = value ?? !isModalVisible;
  // }
</script>

<!-- svelte-ignore a11y-no-noninteractive-tabindex -->
<div
  on:click|stopPropagation={handleClick}
  on:keydown={() => {}}
  {style}
  class={`cursor-pointer relative w-full text-b3 py-2 px-4 hover:bg-bgs3 hover:bg-opacity-50 ${
    classList?.common
  } ${
    isActive
      ? `bg-bgs3 bg-opacity-50 ${classList?.active}`
      : classList?.inactive
  }`}
>
  <div class="whitespace-nowrap flex items-center justify-start">
    {#if icon}
      <div class="min-w-[1rem] mr-2 flex justify-center items-center w-4 h-4">
        <Icon icon={icon.name} size={Size.sm} variant={icon.variant} />
      </div>
    {/if}
    <span>
      {label}
    </span>
    <!-- {#if isModalConfirmation && isModalVisible}
      <Pop
        hideCloseButton
        size={Size.sm}
        classList={`${
          $windowObject.isInPortraitMode
            ? `top-[calc(100%+10px)]`
            : `right-[calc(100%+10px)]`
        } gap-2 flex flex-col`}
        isVisible
      >
        {modalConfirmationMessage}
        <div class="flex justify-evenly">
          <Button on:click={handleClick} size={Size.xs}>
            <span>Yes</span>
          </Button>
          <Button
            on:click={(e) => {
              e.stopPropagation();
              handleCloseModal();
            }}
            size={Size.xs}
          >
            <span>No</span>
          </Button>
        </div>
      </Pop>
    {/if} -->
  </div>
  <slot />
</div>
