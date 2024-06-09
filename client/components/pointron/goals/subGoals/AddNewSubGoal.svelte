<script lang="ts">
  import { GeneralVariants } from "$lib/client/types/generalVariants.enum";
  import { onMount } from "svelte";
  import SubGoalListItem from "./SubGoalListItem.svelte";
  import { appEvents } from "$lib/client/stores/notification.store";
  import type { AppEventType } from "$lib/client/types/event.type";
  import { AppEvent } from "$lib/client/types/event.enum";
  import { actIfClickedOutside, generateUID } from "$lib/client/utils/utils";
  import { currentGoal } from "$lib/client/components/pointron/goals/goal.store";
  import Button from "$lib/client/elements/button/Button.svelte";
  import { Size } from "$lib/client/types/size.enum";

  let label: string | undefined = undefined;
  let isNewSubGoalInputVisible: boolean = false;
  let subGoalInputRef: HTMLInputElement | null = null;
  const formId = generateUID();

  onMount(() => {
    const sub = appEvents.subscribe((x: AppEventType) => {
      if (
        x.event === AppEvent.WINDOW_CLICKED &&
        x.value &&
        x.value instanceof PointerEvent
      ) {
        actIfClickedOutside(x.value, formId, () => {
          toggleNewSubGoalInputVisibility(false)(x.value);
          // timeSuggestions.length > 0 && handleClickOnTimeSuggestion(0)(); // To select the first time suggestion, if present any (in the case of focusout)
        });
      }
    });
    return () => {
      sub();
    };
  });

  function toggleNewSubGoalInputVisibility(isVisible: boolean) {
    return (e: any) => {
      e.stopPropagation();
      if (isVisible)
        setTimeout(() => {
          subGoalInputRef?.focus();
        }, 0);

      isNewSubGoalInputVisible = isVisible;
    };
  }

  async function addNewSubGoal() {
    try {
      //after success
      //add new sub goal
      if (!label) return;
      await currentGoal.addSubGoal(label);
      label = "";
      isNewSubGoalInputVisible = false;
    } catch (err) {
      console.log(err);
    }
  }
</script>

{#if isNewSubGoalInputVisible}
  <form
    id={formId}
    class="relative flex w-full items-center"
    on:submit|preventDefault
  >
    <input
      bind:this={subGoalInputRef}
      on:keydown|stopPropagation
      required
      placeholder="Enter sub goal label"
      class="bg-[transparent] py-2 px-5 outline-none w-full text-fgs1 text-base focus:outline-none focus:boder-none"
      bind:value={label}
    />
    {#if label}
      <div class="flex gap-2">
        <Button
          icon="check-circle"
          label="add"
          parentBackgroundIndex={2}
          size={Size.xs}
          on:click={addNewSubGoal}
        />
        <Button
          icon="cross"
          label="clear"
          parentBackgroundIndex={2}
          size={Size.xs}
          on:click={() => (label = "")}
        />
      </div>
    {/if}
  </form>
{:else}
  <SubGoalListItem
    on:click={toggleNewSubGoalInputVisibility(true)}
    variant={GeneralVariants.ADD}
  >
    + add new sub goal
  </SubGoalListItem>
{/if}
