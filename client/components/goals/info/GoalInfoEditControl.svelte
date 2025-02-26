<script lang="ts">
  import { isValidArrayWithData } from "$lib/shared/utils/obj.utils";
  import ColorPickerMini from "$lib/client/elements/colorPicker/ColorPickerMini.svelte";
  import type { IActiveGoalStore } from "../goal.store";
  import DropDown from "$lib/client/elements/dropdown/DropDown.svelte";
  import { resolveGoalSubTypesForSwitcher } from "../goal.utils";
  import { InputStyle } from "$lib/client/types/input.type";
  export let goal: IActiveGoalStore;
  export let control: "color" | "type";
  function handleColorChange(e: number | string) {
    goal.modify({
      color: +e
    });
  }

  function resolveLabel(control: "color" | "type") {
    if (control === "color") {
      return "Color";
    }
    return "Type";
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
          on:select={(e) => {
            goal.modify({
              type: e.detail
            });
          }}
        />
      </div>
    {/if}
  </div>
{/if}
