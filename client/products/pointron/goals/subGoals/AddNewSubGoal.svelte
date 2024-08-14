<script lang="ts">
  import { GeneralVariants } from "$lib/client/types/generalVariants.enum";
  import SubGoalListItem from "./SubGoalListItem.svelte";
  import { generateUID } from "$lib/client/utils/utils";
  import { currentGoal } from "$lib/client/products/pointron/goals/goal.store";
  import Button from "$lib/client/elements/button/Button.svelte";
  import { Size } from "$lib/client/types/size.enum";

  let label: string | undefined = undefined;
  let isNewSubGoalInputVisible: boolean = false;
  let subGoalInputRef: HTMLInputElement | null = null;
  const formId = generateUID();

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
          parentBgIndex={2}
          size={Size.xs}
          on:click={addNewSubGoal}
        />
        <Button
          icon="cross"
          label="clear"
          parentBgIndex={2}
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
