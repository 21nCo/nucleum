<script lang="ts">
  import Button from "$lib/tidy/elements/Button.svelte";
  import { appStore, blank, windowObject } from "$lib/tidy/stores/app.store";
  import { Size } from "$lib/tidy/types/size.enum";
  import { openLink } from "$lib/tidy/utils/utils";
  import ProductInfoFooter from "./ProductInfoFooter.svelte";
  let size = Size.sm;
</script>

<div class="flex flex-col gap-8 p-2 text-b2">
  {#if $appStore.appData.about}
    <div>
      {@html $appStore.appData.about}
    </div>
  {/if}
  <!-- <div>
    Pointron is built at <a href="https://blanklabs.org"><u>Blank labs</u></a>,
    a self-funded organization with people and planet at its core. Pointron is
    part of our mission to build
    <a href="https://tidigit.com"><u>Tidy Digital Kit</u></a>, a suite of
    software tools aimed to tidy the lives of current and next-gen humans.
  </div> -->
  <div
    class="flex gap-4 w-full self-center {$windowObject.isInPortraitMode
      ? 'flex-col justify-center'
      : 'flex-row flex-wrap'}"
  >
    <Button
      label={$appStore.appData.name + " roadmap"}
      {size}
      icon="link"
      width={$windowObject.isInPortraitMode ? "w-full" : "w-max"}
      on:click={() => {
        openLink($appStore.appData.urls.roadmap);
      }}
    />
    <Button
      label="Join us on discord"
      {size}
      icon="link"
      width={$windowObject.isInPortraitMode ? "w-full" : "w-max"}
      on:click={() => {
        openLink($appStore.appData.urls.discord);
      }}
    />
    <Button
      label="Read about Blank labs"
      {size}
      icon="link"
      width={$windowObject.isInPortraitMode ? "w-full" : "w-max"}
      on:click={() => {
        openLink($appStore.appData.urls.blank);
      }}
    />
  </div>
  <ProductInfoFooter />
</div>
