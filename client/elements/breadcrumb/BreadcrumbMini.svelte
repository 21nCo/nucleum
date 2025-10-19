<script lang="ts">
  import TextWithHoverTooltip from "@21n/elements/text/TextWithHoverTooltip.svelte";
  import { textTruncateMapper } from "@21n/utils/utils";
  export let hierarchy: string[] = [];
  export let slice: number | undefined = undefined;
  export let truncateLength: number = 15;
  let val =
    slice != undefined && slice <= hierarchy?.length
      ? [
          ...hierarchy
            .slice(0, Math.floor(slice / 2))
            .map((text) => textTruncateMapper(text, truncateLength)),
          ...(hierarchy.length > slice ? ["・"] : []),
          ...hierarchy
            .slice(-Math.ceil(slice / 2))
            .map((text) => textTruncateMapper(text, truncateLength))
        ]
          .join(" ・ ")
          .replace("・ ・ ・", "・・")
      : hierarchy
          .map((text) => textTruncateMapper(text, truncateLength))
          .join(" ・ ");
</script>

{#if hierarchy?.length > 0}
  <div class="text-start text-b4 truncate">
    <TextWithHoverTooltip text={val} tooltip={hierarchy.join(" ・ ")} />
  </div>
{/if}
