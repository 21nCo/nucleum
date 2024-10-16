<script lang="ts">
  import Button from "$lib/client/elements/button/Button.svelte";
  import { appStore } from "$lib/client/stores/app.store";
  import { Size } from "$lib/client/types/size.enum";

  import ProductInfoFooter from "./ProductInfoFooter.svelte";
  import view from "$lib/client/stores/view.store";
  let size = Size.sm;
</script>

<div class="flex flex-col gap-8 p-2 text-b2 text-left">
  {#if $appStore.appData.about}
    <div>
      {@html $appStore.appData.about}
    </div>
  {/if}
  <div
    class="flex gap-4 w-full self-center {$view.isPortrait
      ? 'flex-col justify-center'
      : 'flex-row flex-wrap'}"
  >
    <Button
      label="Join us on discord"
      {size}
      icon="link"
      on:click={() => {
        appStore.openLink($appStore.appData?.urls?.discord);
      }}
    />
    <Button
      label="Read more about 21n"
      {size}
      icon="link"
      on:click={() => {
        appStore.openLink($appStore.appData?.urls?.blank);
      }}
    />
  </div>
  <ProductInfoFooter />
</div>
