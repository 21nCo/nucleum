<script lang="ts">
  import { goalEditErrorMessage } from "$lib/client/products/pointron/goals/goal.store";
  import InlineErrorMessage from "$lib/client/elements/text/InlineErrorMessage.svelte";
  import modalEvent from "$lib/client/components/modal/modal.store";
  import NewGoalForm from "./NewGoalForm.svelte";
  import { page } from "$app/stores";
  import ModalFooter from "$lib/client/components/modal/ModalFooter.svelte";
  import { PointronAction } from "$lib/client/types/pointron/pointronAction.enum";
  import { newGoal } from "./store";
  export let isPinToQuickFocus: boolean = false;
  newGoal.reset();
  let isPinToQuickFocusParam = $page.url.searchParams.get("isPinToQuickFocus");
  if (isPinToQuickFocusParam) {
    isPinToQuickFocus = isPinToQuickFocusParam === "true";
  }
  $newGoal.isPinnedForQuickStart = isPinToQuickFocus;
  function close() {
    modalEvent.hideSpecific(PointronAction.CREATE_EDIT_GOAL);
  }
  async function discard() {
    newGoal.reset();
    close();
  }
</script>

<div class="flex flex-col items-start gap-6 w-full h-full">
  <div class="flex flex-col gap-6 w-full px-1 grow overflow-y-auto">
    <NewGoalForm />
  </div>
  <footer class="flex flex-col w-full pb-8 gap-2">
    <InlineErrorMessage bind:error={$goalEditErrorMessage} />
    <ModalFooter
      action={PointronAction.CREATE_EDIT_GOAL}
      on:close={discard}
      primaryAction={{
        label: "Save",
        callback: async () => {
          await newGoal.save();
          if (!$goalEditErrorMessage) close();
        }
      }}
      secondaryAction={{
        label: "Discard",
        callback: discard
      }}
    />
  </footer>
</div>

<style>
  .overflow-y-auto {
    overscroll-behavior-y: none;
  }
</style>
