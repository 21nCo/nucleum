<script lang="ts">
  import { isValidArrayWithData } from "$lib/shared/utils/obj.utils";
  import ColorPickerMini from "$lib/client/elements/colorPicker/ColorPickerMini.svelte";
  import type { IActiveGoalStore } from "../goal.store";
  import {
    AlertType,
    type IInlineStatus
  } from "$lib/client/types/notification.type";
  import DropDown from "$lib/client/elements/dropdown/DropDown.svelte";
  import { resolveGoalSubTypesForSwitcher } from "../goal.utils";
  import { InputStyle } from "$lib/client/types/input.type";
  import type { GoalType } from "../goal.type";
  export let goal: IActiveGoalStore;
  export let control: "color" | "type";
  export let status: IInlineStatus | undefined = undefined;
  async function handleColorChange(e: number | string) {
    status = {
      message: "Updating color...",
      type: AlertType.PROGRESS
    };
    const result = await goal.modify({
      color: +e
    });
    if (!result || result.error) {
      status = {
        type: AlertType.ERROR,
        message: "Failed to update goal color"
      };
      return;
    }
    status = {
      message: "Color updated",
      type: AlertType.SUCCESS
    };
  }

  function resolveLabel(control: "color" | "type") {
    if (control === "color") {
      return "Color";
    }
    return "Type";
  }

  async function handleTypeChange(e: CustomEvent<GoalType>) {
    status = {
      message: "Updating type...",
      type: AlertType.PROGRESS
    };
    const result = await goal.modify({
      type: e.detail
    });
    if (!result || result.error) {
      status = {
        type: AlertType.ERROR,
        message: "Failed to update goal type"
      };
      return;
    }
    status = {
      message: "Type updated",
      type: AlertType.SUCCESS
    };
  }
</script>

{#if (control === "color" && !isValidArrayWithData($goal.parent)) || control !== "color"}
  <div
    class="flex flex-col gap-2 border border-brs3 rounded-md px-2 py-1 h-full"
  >
    <span class="text-left text-b2 text-fgs3">{resolveLabel(control)}</span>
    {#if control === "color"}
      <ColorPickerMini
        bind:hue={$goal.color}
        width="w-full"
        onDebouncedChangeCallback={handleColorChange}
      />
    {:else if control === "type"}
      <div class="my-auto">
        <DropDown
          items={resolveGoalSubTypesForSwitcher()}
          value={$goal.type}
          isDisableSearch={true}
          style={InputStyle.PLAIN}
          on:select={handleTypeChange}
        />
      </div>
    {/if}
  </div>
{/if}
