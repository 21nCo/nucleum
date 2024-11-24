<script lang="ts">
  import Button from "$lib/client/elements/button/Button.svelte";
  import { appStore } from "$lib/client/stores/app.store";
  import { Size } from "$lib/client/types/size.enum";
  import A21nLogo from "$lib/client/branding/A21nLogo.svelte";
  import { ButtonVariant } from "$lib/client/types/button.type";
  let size = Size.md;
</script>

<div class="flex flex-col gap-8 py-2 text-b2 text-left">
  {#if $appStore.appData.about}
    <div>
      {@html $appStore.appData.about}
    </div>
  {:else}
    <div class="flex flex-col gap-8 items-center">
      <div class="flex flex-col gap-7 w-full max-w-3xl">
        <div class="bg-bgs2 rounded-[20px] p-7 flex flex-col gap-4 w-full">
          <div class="">
            We are a small independent team based in Hyderabad, India. We are on
            a mission to build great products, transform the way we do business
            and treat our planet well while doing so.
          </div>
          <div>
            <div
              class="flex items-center gap-1 text-fgs2 text-b3 w-full justify-start"
            >
              <span class="-mb-0.5"> - Team </span>
              <A21nLogo size={Size.xs} fill="fgs2" />
            </div>
          </div>
        </div>
      </div>
    </div>
  {/if}
  <div class="flex w-full justify-center">
    <div class="flex portrait:flex-col gap-4">
      <Button
        label="Join us on discord"
        {size}
        type={ButtonVariant.PRIMARY}
        icon="ph:discord-logo"
        on:click={() => {
          appStore.openLink($appStore.appData?.urls?.discord);
        }}
      />
      <Button
        label="Read our white paper"
        {size}
        icon="ph:arrow-up-right"
        on:click={() => {
          appStore.openLink($appStore.appData?.urls?.soft);
        }}
      />
    </div>
  </div>
</div>
