<script lang="ts">
  import SubAtomLogo from "$lib/client/branding/SubAtomLogo.svelte";
  import ColorSchemeSelector from "$lib/client/components/settings/appearance/ColorSchemeSelector.svelte";
  import Button from "$lib/client/elements/button/Button.svelte";
  import { appStore } from "$lib/client/stores/app.store";
  import appearance from "$lib/client/stores/appearance.store";
  import view from "$lib/client/stores/view.store";
  import { Theme } from "$lib/client/types/appearance.type";
  import { ButtonVariant } from "$lib/client/types/button.type";
  import { Size } from "$lib/client/types/size.enum";
  import YoutubeVideoPreview from "../node/content/web/YoutubeVideoPreview.svelte";

  function saveColorScheme(e: CustomEvent) {
    appearance.setColorScheme(e.detail);
    appearance.modifySyncWithSystem($appearance.isSyncWithSystem);
  }
</script>

<div class="flex w-full h-full justify-center items-center mo:p-4 p-8">
  <div
    class="flex cw:flex-col w-full justify-center items-center gap-4 h-full max-h-full overflow-auto"
  >
    <main class="flex flex-col items-center cw:w-full w-1/2">
      <div class="flex flex-col cw:items-center gap-32">
        <div class="flex flex-col cw:items-center gap-4">
          <SubAtomLogo />
          <div class="text-fgs1 cw:text-h3 text-6xl font-medium">
            At last, your memory atlas!
          </div>
          <span class="text-fgs3 text-b2">
            One click to unlock your digital memory paradise. ✨🎉
          </span>
        </div>
        <div class="cw:w-full cw:flex cw:justify-center">
          <ColorSchemeSelector
            label="Pick your color scheme"
            size={Size.sm}
            theme={$appearance?.colorScheme?.isDark ? Theme.DARK : Theme.LIGHT}
            selectedSchemeId={$appearance?.colorScheme?.isDark
              ? $appearance.darkColorSchemeId
              : $appearance.lightColorSchemeId}
            on:select={saveColorScheme}
          />
        </div>
        <div class="flex w-full cw:justify-center gap-4">
          <Button
            label="Get started"
            icon="ph:arrow-right-light"
            type={ButtonVariant.PRIMARY}
            on:click={() => appStore.gotoPath("/")}
          />
          <Button
            label="Read the docs"
            icon="ph:book-open-text-light"
            on:click={() => appStore.openLink($appStore.appData?.urls?.guides)}
          />
        </div>
      </div>
    </main>
    {#if !$view.isConstrainedWidth}
      <aside class="cw:w-full w-1/2">
        {#if $appStore?.appData?.urls?.onboardingVideo}
          <div
            class="cw:w-full w-[40rem] max-w-full h-96 mx-auto rounded-lg overflow-hidden"
          >
            <YoutubeVideoPreview
              url={$appStore?.appData?.urls?.onboardingVideo}
            />
          </div>
        {/if}
      </aside>
    {/if}
  </div>
</div>
