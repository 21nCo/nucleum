<script>
  import Button from "$lib/client/elements/button/Button.svelte";
  import LeftNavFixed from "$lib/client/layout/leftPanel/LeftNavFixed.svelte";
  import { appStore } from "$lib/client/stores/app.store";
  import { Action } from "$lib/client/types/action.enum";
  import { Size } from "$lib/client/types/size.enum";
</script>

<LeftNavFixed>
  <slot name="header" slot="header">
    <div class="w-full flex justify-center">
      <Button
        icon="ph:magnifying-glass-light"
        parentBgIndex={2}
        size={Size.lg}
        on:click={() => appStore.runAction(Action.GLOBAL_SEARCH)}
      />
    </div>
  </slot>
</LeftNavFixed>
