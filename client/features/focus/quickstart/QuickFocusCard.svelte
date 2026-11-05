<!--
  @component
  Start-focus card for the phone home: today's focus total, the objectives
  pinned for quick focus (tap one to start a quick session), and a button that
  opens focus to start a full session.
-->
<svelte:options runes={true} />

<script lang="ts">
  import { requireCommandHost } from "@nucleum/shared-state/commands/command-host";
  import { PointronAction } from "@nucleum/client/config/focus-action.enum";
  import { Layout } from "@nucleum/shell/layout-mode.type";
  import QuickStartThumbnailList from "@nucleum/features/focus/quickstart/QuickStartThumbnailList.svelte";
  import {
    createPinnedQuickFocusStore,
    createTodayFocusLogStore,
    msUntilNextDay,
    resolveQuickFocusItems,
    sumFocus
  } from "@nucleum/features/focus/quickstart/quick-focus";
  import Button from "@21n/ui/elements/button/Button.svelte";
  import {
    ButtonStyle,
    ButtonVariant
  } from "@21n/ui/elements/button/button.type";
  import Icon from "@21n/ui/elements/Icon.svelte";
  import { Size } from "@21n/ui/elements/size.enum";
  import { formatSeconds } from "@21n/ui/elements/time/duration-format";

  const pinnedObjectiveStore = createPinnedQuickFocusStore();
  let today = $state(new Date());
  const todayLogStore = $derived(createTodayFocusLogStore(today));

  $effect(() => {
    const timeout = setTimeout(
      () => {
        today = new Date();
      },
      msUntilNextDay(today) + 1000
    );
    return () => clearTimeout(timeout);
  });
  const items = $derived(
    resolveQuickFocusItems($pinnedObjectiveStore.data, $todayLogStore.data)
  );
  const todayTotal = $derived(sumFocus($todayLogStore.data));
</script>

<section
  class="flex flex-col mt-auto max-h-full min-h-0 bg-bgs1 border-t border-brs2"
  aria-label="Start focus"
  data-testid="quick-focus-card"
>
  <div class="flex items-center justify-between gap-2 px-4 pt-4 pb-3">
    <div class="flex flex-col">
      <h2 class="text-fgs1 text-h4 font-medium">Start focus</h2>
      <span class="text-fgs3 text-b3" data-testid="quick-focus-today-total">
        {#if $todayLogStore.loading}
          &nbsp;
        {:else}
          {todayTotal > 0
            ? `Today: ${formatSeconds(todayTotal)}`
            : "Not focused today"}
        {/if}
      </span>
    </div>
    <Button
      label="Focus"
      icon="focus"
      type={ButtonVariant.PRIMARY}
      testId="quick-focus-start"
      onclick={() => requireCommandHost().runAction(PointronAction.FOCUS)}
    />
  </div>
  <div class="flex flex-col flex-1 min-h-0 overflow-y-auto pb-6">
    {#if items.length > 0}
      <QuickStartThumbnailList
        {items}
        layout={Layout.LIST}
        isInEditMode={false}
        title="Quick focus"
      />
    {:else if !$pinnedObjectiveStore.loading}
      <div class="flex flex-col items-center gap-3 px-4 py-6 text-center">
        <Icon icon="focus" size={Size.lg} class="text-fgs3" />
        <span class="text-fgs2 text-b2">
          Pin objectives here to start focusing in one tap.
        </span>
        <Button
          label="Pin an objective"
          size={Size.sm}
          style={ButtonStyle.OUTLINED}
          onclick={() =>
            requireCommandHost().runAction(PointronAction.PIN_TO_QUICK_FOCUS)}
        />
      </div>
    {/if}
  </div>
</section>
