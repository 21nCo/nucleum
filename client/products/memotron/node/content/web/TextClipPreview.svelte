<script lang="ts">
  import { ResourceAccessPoint } from "$lib/client/components/flux/resourceStores/resource.type";
  import { highlightStore } from "$lib/client/products/memotron/common/highlighters/highlight.store";
  import {
    type INode,
    NodeType
  } from "$lib/client/products/memotron/node/node.type";
  import { cn, convertToRGBA } from "$lib/client/utils/ui.utils";
  import { truncateString } from "$lib/shared/utils/text.utils";
  import Button from "$lib/client/elements/button/Button.svelte";
  import { ButtonStyle } from "$lib/client/types/button.type";
  import { Size } from "$lib/client/types/size.enum";
  import { toasts } from "$lib/client/stores/notification.store";
  import { preferences } from "$lib/client/stores/preferences/preferences.store";
  import {
    Preference,
    PreferencesScope
  } from "$lib/client/stores/preferences/preferences.type";
  import { appStore } from "$lib/client/stores/app.store";
  import { derived } from "svelte/store";
  import { Arrangement } from "$lib/client/types/direction.enum";
  export let node: INode;
  export let contentPreview: string;
  export let truncateLength: number | undefined = undefined;
  export let accessPoint: ResourceAccessPoint = ResourceAccessPoint.SELF;
  export let arrangement: Arrangement = Arrangement.LIST;

  const hideHighlightColors = derived(
    [preferences, appStore],
    ([$preferences, $appStore]) => {
      const key = `${$appStore.product}-${Preference.HIDE_HIGHLIGHT_COLORS}`;
      return ($preferences[key] as boolean) ?? false;
    }
  );

  $: textHightlightColor = $hideHighlightColors
    ? undefined
    : resolveTextHighlightColor(node);

  function getKindleHighlightRGBA(color: string, opacity: number) {
    const colorMap = {
      blue: "0, 0, 255",
      green: "0, 255, 0",
      yellow: "255, 255, 0",
      orange: "255, 128, 0",
      pink: "255, 0, 255"
    };
    return `rgba(${colorMap[color]}, ${opacity})`;
  }

  function resolveTextHighlightColor(item: any) {
    if (
      item.contentType === NodeType.WEB_TEXT_BOOKMARK &&
      item.body.highlighterId
    ) {
      const color = $highlightStore?.highlighters?.find(
        (x) => x.id === item.body.highlighterId
      )?.color;
      return color ? convertToRGBA(color, 0.4) : undefined;
    } else if (
      item.contentType === NodeType.KINDLE_HIGHLIGHT &&
      item.body.color
    ) {
      return getKindleHighlightRGBA(item.body.color, 0.3);
    } else {
      return undefined;
    }
  }

  async function copyTextContent() {
    const text = node.text || node.mdText || contentPreview || "";
    if (text) {
      await navigator.clipboard.writeText(text);
      toasts.success("Text copied to clipboard");
    }
  }
</script>

<div class="flex flex-col gap-2">
  <div
    class={cn("rounded-md text-wrap text-left userdata selectable", {
      "m-4 p-4 bg--bgs2": accessPoint === ResourceAccessPoint.SELF,
      "line-clamp-3":
        accessPoint !== ResourceAccessPoint.SELF &&
        accessPoint !== ResourceAccessPoint.NODE_TRACES &&
        arrangement === Arrangement.LIST,
      "line-clamp-5": accessPoint === ResourceAccessPoint.NODE_TRACES
    })}
  >
    <span
      class={cn("relative", {
        "text-b2": accessPoint === ResourceAccessPoint.SELF,
        "text-fgs3":
          accessPoint !== ResourceAccessPoint.SELF &&
          !textHightlightColor &&
          arrangement !== Arrangement.LIST
      })}
      style="background-color: {textHightlightColor
        ? textHightlightColor
        : 'transparent'};"
    >
      {truncateString(contentPreview, truncateLength)}
    </span>
  </div>
  {#if accessPoint === ResourceAccessPoint.SELF}
    <div class="flex justify-center items-center w-full gap-4 pb-4">
      <Button
        style={ButtonStyle.PLAIN}
        label="Copy text content"
        isUnderlined={true}
        size={Size.sm}
        on:click={copyTextContent}
      />
    </div>
  {/if}
</div>
