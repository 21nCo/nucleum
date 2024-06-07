<script lang="ts">
  import { currentGoal } from "$lib/client/components/pointron/goals/goal.store";
  import { tagStore } from "$lib/client/components/pointron/local.store";
  import ChipsAutocomplete from "$lib/client/elements/autocomplete/ChipsAutocomplete.svelte";
  import TextArea from "$lib/client/elements/input/TextArea.svelte";
  import InlineInfoBanner from "$lib/client/elements/text/InlineInfoBanner.svelte";
  import { isInEditMode } from "$lib/client/stores/app.store";
  import { ChipVariant } from "$lib/client/types/chipVariant.enum";
  import { isValidArrayWithData } from "$lib/client/utils/obj.utils";
  import { formatDate } from "$lib/client/utils/time.utils";
  import GoalInsights from "../../insights/GoalInsights.svelte";
  import GoalColorPickerWithPreview from "../GoalColorPickerWithPreview.svelte";
  import GoalActions from "../home/GoalActions.svelte";
  import SubGoalList from "../subGoals/SubGoalList.svelte";

  $: goalTags = $tagStore.tags.filter((x) => $currentGoal.tags?.includes(x.id));
</script>

<div class="flex flex-col gap-10">
  <div class="flex flex-col gap-4">
    {#if $isInEditMode && !$currentGoal.isArchived}
      <GoalActions />
      {#if $currentGoal.parent?.hierarchy.length === 0}
        <GoalColorPickerWithPreview bind:hue={$currentGoal.color} />
      {/if}
      <TextArea
        placeholder="Type description of the goal here"
        bind:value={$currentGoal.description}
        label={{ label: "Description" }}
        rows={3}
      />
      <ChipsAutocomplete
        label="Tags"
        bind:values={$currentGoal.tags}
        chipsVariant={ChipVariant.OUTLINED}
        placeholder={$currentGoal.tags?.length
          ? "type to add"
          : "start typing to add tags"}
        options={$tagStore.tags}
      />
    {:else}
      <div class="text-b2 text-fgs3 flex gap-4 justify-between">
        <div>
          {$currentGoal.description ?? ""}
        </div>
      </div>
      {#if isValidArrayWithData(goalTags)}
        <div class="flex flex-col gap-2">
          <div class="text-b2 text-fgs3">Tags</div>
          <div class="flex gap-2">
            {#each goalTags as tag}
              <div class="border border-brs3 rounded-md px-3">{tag.label}</div>
            {/each}
          </div>
        </div>
      {/if}
    {/if}
  </div>
  <div class="flex flex-col gap-4">
    {#if $currentGoal.isArchived}
      <GoalActions />
      <InlineInfoBanner
        content="This goal is archived. **Unarchive** it to add sub goals, view insights, add while focusing. This goal will still be shown in analytics and journal. Please **delete** the goal to completely remove it everywhere."
      />
    {:else}
      <SubGoalList />
      <GoalInsights />
    {/if}
  </div>
  <footer class="flex justify-center text-fgs3 text-b4 min-w-fit pt-32 pb-10">
    {$currentGoal.created
      ? "Goal created on " +
        formatDate(new Date($currentGoal.created), "verbose")
      : ""}
  </footer>
</div>
