<script lang="ts">
  import Button from "$lib/client/elements/button/Button.svelte";
  import { ButtonVariant } from "$lib/client/types/button.type";
  import FeedbackPaneBase from "./FeedbackPaneBase.svelte";
  export let message: string;
</script>

<FeedbackPaneBase>
  <div class="flex flex-col gap-3 h-40 justify-between">
    <div class="flex w-full justify-center items-center">
      {message}
    </div>
    <div class="flex justify-center">
      <Button
        icon="arrow-right"
        label="Login"
        type={ButtonVariant.PRIMARY}
        on:click
      />
    </div>
  </div>
</FeedbackPaneBase>
