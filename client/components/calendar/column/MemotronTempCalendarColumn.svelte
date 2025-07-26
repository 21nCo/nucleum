<script lang="ts">
  import Button from "$lib/client/elements/button/Button.svelte";
  import Text from "$lib/client/elements/text/Text.svelte";
  import InlineFeedbackText from "$lib/client/extensions/clipper/InlineFeedbackText.svelte";
  import { appStore } from "$lib/client/stores/app.store";
  import { Action } from "$lib/client/types/action.enum";
  import { AppSearchParam } from "$lib/client/types/appStore.type";
  import { TextStyle } from "$lib/client/types/text.enum";
  import { TimeScaleUnit } from "$lib/client/types/time.type";
  import { parseAndFormatDate } from "$lib/client/utils/time.utils";
  import { ResourceAccessMode } from "../../flux/resourceStores/resource.type";
  import CalendarNotesPanel from "./CalendarNotesPanel.svelte";
  import {
    AlertType,
    type IInlineStatus
  } from "$lib/client/types/notification.type";
  import { setContext } from "svelte";
  import { Size } from "$lib/client/types/size.enum";
  import { debouncer } from "$lib/client/utils/utils";
  import { generateSimpleRandomId } from "$lib/shared/utils/crypto.utils";

  export let date: Date;
  let mdId = generateSimpleRandomId();
  let feedback: IInlineStatus | undefined = undefined;

  function handleContentEvent(event: string, data: any) {
    debouncedShowFeedback(event);
  }

  const debouncedShowFeedback = debouncer(showFeedback, 1000);

  function showFeedback(event: string) {
    if (event === "start") {
      feedback = {
        message: "",
        type: AlertType.PROGRESS
      };
    } else if (event === "success") {
      feedback = {
        message: "",
        type: AlertType.PROGRESS
      };
      setTimeout(() => {
        feedback = {
          message: "Saved!",
          type: AlertType.SUCCESS
        };
      }, 600);
    } else if (event === "error") {
      feedback = {
        message: "Save failed",
        type: AlertType.ERROR
      };
    }
  }

  const calendarContentContext = {
    publish: handleContentEvent
  };

  setContext("calendar-content", calendarContentContext);
</script>

<div
  class="flex flex-col gap-2 h-full flex-grow w-full"
  id="mdcontainer-{mdId}"
>
  <div class="flex justify-between px-12 pt-3">
    <div class="flex items-center gap-2 whitespace-nowrap">
      <Text
        content={parseAndFormatDate(date)}
        style={TextStyle.PANEL_HEADING_SMALL}
      />
      <span class="text-b2 text-fgs3">| Notes </span>
      <InlineFeedbackText {feedback} size={Size.sm} />
    </div>
    <Button
      icon="ph:clock-counter-clockwise-light"
      tooltip="History"
      on:click={() => {
        appStore.openResource(Action.HISTORY, ResourceAccessMode.POP, {
          searchParams: { [AppSearchParam.DATE]: date.toISOString() }
        });
      }}
    />
  </div>
  <div class="px-1 flex-grow">
    <CalendarNotesPanel {date} scale={TimeScaleUnit.DAY} {mdId} />
  </div>
</div>
