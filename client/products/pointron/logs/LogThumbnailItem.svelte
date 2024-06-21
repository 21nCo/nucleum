<script lang="ts">
  import { PointronEventEnum } from "$lib/client/types/pointron/pointronEvent.enum";
  import Divider from "$lib/client/elements/Divider.svelte";
  import Icon from "$lib/client/elements/Icon.svelte";
  import Text from "$lib/client/elements/text/Text.svelte";
  import { appStore, userPreferences } from "$lib/client/stores/app.store";
  import view from "$lib/client/stores/view.store";
  import { Orientation } from "$lib/client/types/direction.enum";
  import { TextStyle } from "$lib/client/types/text.enum";
  import { ColorStrength } from "$lib/client/types/appearance.type";
  import { resolveHoverState } from "$lib/client/utils/browser.utils";
  import { formatSeconds, formatTime } from "$lib/client/utils/time.utils";
  import type { LogThumbnail } from "./log.type";
  import CustomColorPropagator from "$lib/client/elements/style/CustomColorPropagator.svelte";
  import { cn } from "$lib/client/utils/ui.utils";
  import HoverableElement from "$lib/client/elements/HoverableElement.svelte";
  export let log: LogThumbnail;
  export let context: "journal" | "logs" = "logs";
  export let isLast: boolean = false;
  export let variant: "v1" | "v2" = "v1";
  let isEnableVariableHeight: boolean = true;
  let isHovering: boolean = false;
  let height = 166;
  let total = log.totalFocus + log.totalBreak;
  let minHeight = 110;

  if (isEnableVariableHeight) {
    // let baseHeight = 110;
    // let heightPerUnit = 1 / 300;
    // height = baseHeight + total * heightPerUnit;
    // height = Math.min(height, 200);
    if (total <= 60) {
      height = minHeight;
    } else if (total <= 600) {
      height = minHeight + 10;
    } else if (total <= 1200) {
      height = minHeight + 20;
    } else if (total <= 1800) {
      height = minHeight + 30;
    } else if (total <= 2400) {
      height = minHeight + 40;
    } else if (total <= 3000) {
      height = minHeight + 50;
    } else if (total <= 3600) {
      height = minHeight + 60;
    } else if (total <= 7200) {
      height = minHeight + 70;
    } else if (total <= 10800) {
      height = minHeight + 80;
    } else if (total <= 14400) {
      height = minHeight + 90;
    } else {
      height = minHeight + 100;
    }
  }

  async function handleDelete(event: MouseEvent) {
    appStore.runAction(PointronEventEnum.DELETE_SESSION, { id: log.id });
    event.stopPropagation();
  }
  const toggleHoveringState = (event: MouseEvent | FocusEvent) => {
    isHovering = resolveHoverState(event);
  };
</script>

<!-- TODO - Svelte 5 snippets - time label -->
<HoverableElement
  bind:isHovering
  id="log-item"
  class={cn(
    "relative flex w-full gap-2 items-center rounded-md border border-brs3 p-4",
    {
      "mb-10": isLast
    }
  )}
  style="min-height: {height}px;"
  on:click
>
  <div
    class={cn(
      "flex h-full flex-col justify-between items-start gap-1 rounded-l-md text-b2",
      {
        "w-[31%]": variant === "v1" && $view.isPortrait,
        "w-[28%]": variant === "v1" && !$view.isPortrait,
        "pr-8 w-1/4": variant === "v2"
      }
    )}
  >
    <div
      class={cn({
        "text-b3 text-fgs2": variant === "v2",
        "mo:text-b2 text-b3 text-fgs3": variant === "v1"
      })}
    >
      {formatTime($userPreferences, new Date(log.start))}
    </div>
    <div class="flex h-full gap-2">
      <!-- <div class="bg-bgs3 h-full w-0.5 flex-grow rounded-full" /> -->
      <Divider
        orientation={Orientation.Vertical}
        colorStrength={ColorStrength.Strong}
      />
      {#if variant === "v1"}
        <div class="flex h-full text-start items-center gap-2">
          <div class="flex flex-col gap w-ful text-fgs2">
            {#if isEnableVariableHeight && height < 140}
              <div class="min-w-fit text-fgs1 text-b4">
                {formatSeconds(total)}
              </div>
            {:else}
              <div class="min-w-fit text-aps1 text-b3">
                <!-- {$windowObject.isInPortraitMode ? "F:" : "Focus:"} -->
                F:
                {formatSeconds(log.totalFocus)}
              </div>
              <div class="min-w-fit text-ass1 text-b3">
                <!-- {$windowObject.isInPortraitMode ? "B:" : "Break:"} -->
                B:
                {formatSeconds(log.totalBreak)}
              </div>
            {/if}
          </div>
        </div>
      {/if}
    </div>
    <div
      class={cn({
        "text-b3 text-fgs2": variant === "v2",
        "mo:text-b2 text-b3 text-fgs3": variant === "v1"
      })}
    >
      {formatTime($userPreferences, new Date(log.end))}
    </div>
  </div>
  <div
    class={cn("flex flex-col h-full gap-1", {
      "w-[69%]": variant === "v1" && $view.isPortrait,
      "w-[72%]": variant === "v1" && !$view.isPortrait
    })}
  >
    <div class="flex-grow flex flex-col items-start gap-2 overflow-y-auto">
      {#if variant === "v1"}
        <!-- <div class="text-start text-b4 text-fgs2 font-medium">GOALS</div> -->
        <Text content="Goals" style={TextStyle.SECTION_HEADING} />
      {/if}
      <div class="flex flex-col w-full">
        {#if log.goals && log.goals.length > 0}
          {#each log.goals as goal}
            <CustomColorPropagator
              color={goal.color ?? goal.parent?.color}
              class="flex w-full gap-2 text-base items-center"
            >
              <div class="w-2 h-2 rounded-sm bg-ccs1" />
              <div class="text-left mo:text-b2 text-ccs1 truncate w-4/5">
                <!-- {truncateString(goal.label, $view.isPortrait ? 20 : 25)} -->
                {goal.label}
              </div>
            </CustomColorPropagator>
          {/each}
        {:else}
          <div class="text-b4 text-fgs2 font-medium">NO GOALS</div>
        {/if}
      </div>
      <!-- {#if isValidMarkdown(log.notes)}
        <Button
          label="copy notes"
          size={Size.xs}
          parentBackgroundIndex={2}
          on:click={(e) => {
            e.stopPropagation();
            const markdownText = generateMarkdownText(log.notes.blocks);
            navigator.clipboard.writeText(markdownText);
          }}
        />
      {/if} -->
    </div>
    {#if variant === "v2"}
      <div
        class="flex gap-2 justify-between text-b4 border-t border-brs1 px-3 py-1 rounded-md"
      >
        <div class="min-w-fit text-fgs1">
          Total:
          {formatSeconds(total)}
        </div>
        <div class="min-w-fit text-aps1">
          F:
          {formatSeconds(log.totalFocus)}
        </div>
        <div class="min-w-fit text-ass1">
          B:
          {formatSeconds(log.totalBreak)}
        </div>
      </div>
    {/if}
  </div>
  <div
    class="absolute right-0 mr-4 rounded-r-md h-full flex flex-col pr-2 justify-center"
  >
    {#if context == "logs" || (isHovering && !$view.isPortrait)}
      <Icon icon="chevright" />
    {/if}
  </div>
</HoverableElement>
