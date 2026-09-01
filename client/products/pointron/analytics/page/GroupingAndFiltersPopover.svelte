<script lang="ts">
  import Text from "@21n/elements/text/Text.svelte";
  import SwitchInput from "@21n/elements/toggle/SwitchInput.svelte";
  import { TextStyle } from "@21n/types/text.enum";

  let {
    isGroupByTopLevelGoals = $bindable(false),
    onGroupByChange
  }: {
    isGroupByTopLevelGoals?: boolean;
    onGroupByChange: (e: CustomEvent) => void;
  } = $props();
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
      onChange={onGroupByChange}
    />
  </div>
</div>
