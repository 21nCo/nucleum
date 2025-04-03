<script lang="ts">
  import Text from "$lib/client/elements/text/Text.svelte";
  import SwitchInput from "$lib/client/elements/toggle/SwitchInput.svelte";
  import { TextStyle } from "$lib/client/types/text.enum";
  export let isGroupByTopLevelGoals = false;
  export let onGroupByChange: (e: CustomEvent) => void;
</script>

<div class="cw:w-full w-96 h-60 flex flex-col gap-6 cw:p-2 p-4 bg-bgs1">
  <Text content="Card options" style={TextStyle.SECTION_HEADING} />
  <div class="flex flex-col gap-2">
    <SwitchInput
      label={{
        label: "Group by top level goals"
      }}
      isExpanded={true}
      bind:checked={isGroupByTopLevelGoals}
      on:change={onGroupByChange}
    />
  </div>
</div>
