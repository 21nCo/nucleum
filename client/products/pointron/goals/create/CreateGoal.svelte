<script lang="ts">
  import {
    goalEditErrorMessage,
    newGoalStore
  } from "$lib/client/products/pointron/goals/goal.store";
  import InlineErrorMessage from "$lib/client/elements/text/InlineErrorMessage.svelte";
  import modalEvent from "$lib/client/components/modal/modal.store";
  import NewGoalForm from "./NewGoalForm.svelte";
  import { page } from "$app/stores";
  import ModalFooter from "$lib/client/components/modal/ModalFooter.svelte";
  import { PointronEventEnum } from "$lib/client/types/pointron/pointronEvent.enum";
  export let isPinToQuickFocus: boolean = false;
  newGoalStore.reset();
  let isPinToQuickFocusParam = $page.url.searchParams.get("isPinToQuickFocus");
  if (isPinToQuickFocusParam) {
    isPinToQuickFocus = isPinToQuickFocusParam === "true";
  }
  $newGoalStore.goal.isPinnedForQuickStart = isPinToQuickFocus;
  function close() {
    modalEvent.hideSpecific(PointronEventEnum.CREATE_EDIT_GOAL);
  }
</script>

<div class="flex flex-col items-start gap-6 w-full h-full">
  <div class="flex flex-col gap-6 w-full px-1 grow overflow-y-auto">
    <NewGoalForm />
  </div>
  <footer class="flex flex-col w-full pb-8 gap-2">
    <InlineErrorMessage bind:error={$goalEditErrorMessage} />
    <ModalFooter
      isPreventAutoClose={true}
      primaryAction={{
        label: "Save",
        callback: async () => {
          await newGoalStore.save();
          if (!$goalEditErrorMessage) close();
        }
      }}
      secondaryAction={{
        label: "Discard",
        callback: async () => {
          newGoalStore.reset();
          close();
        }
      }}
    />
  </footer>
</div>

<style>
  .overflow-y-auto {
    overscroll-behavior-y: none;
  }
</style>
