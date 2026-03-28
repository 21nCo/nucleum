<script lang="ts">
  import BoxButton from "@21n/elements/button/BoxButton.svelte";
  import { appStore } from "@21n/stores/app.store";
  import { Action } from "@21n/types/action.enum";
  export let isInThinMode: boolean = false;
  export let isRounded: boolean = false;
  $: [isInThinMode, isRounded];
</script>

<div class="w-full h-12">
  <BoxButton
    icon="question"
    tooltip="Help"
    parentBgIndex={2}
    on:click={async () => appStore.runAction(Action.HELP)}
  />
</div>
