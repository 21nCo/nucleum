<svelte:options runes={true} />

<script lang="ts">
  import PhoneHome from "@nucleum/surfaces/home/PhoneHome.svelte";
  import FocusTopNavWidget from "@nucleum/features/focus/player/FocusTopNavWidget.svelte";
  import FocusPlayer from "@nucleum/features/focus/player/FocusPlayer.svelte";
  import QuickFocusCard from "@nucleum/features/focus/quickstart/QuickFocusCard.svelte";
  import { activeSession } from "@nucleum/features/focus/session.store";
  import { isPlayerShownInPage } from "@nucleum/shell/overlays/portrait-dock";
  import view from "@21n/ui/environment/view.store";

  const isSlotShown = $derived(
    !$activeSession.isSessionRunning || $view.isPortrait
  );
</script>

{#snippet focusSlot()}
  {#if $activeSession.isSessionRunning}
    <section
      class="flex flex-col flex-1 justify-end"
      aria-label="Running focus session"
      data-testid="phone-home-running-session"
    >
      {#if $isPlayerShownInPage}
        <div class="pb-6 bg-bgs1 border-t border-brs2">
          <FocusPlayer />
        </div>
      {/if}
    </section>
  {:else}
    <QuickFocusCard />
  {/if}
{/snippet}

<PhoneHome
  isPlayerInSlot={$activeSession.isSessionRunning}
  slot={isSlotShown ? focusSlot : undefined}
>
  {#snippet indicators()}
    <FocusTopNavWidget mode="indicator" />
  {/snippet}
</PhoneHome>
