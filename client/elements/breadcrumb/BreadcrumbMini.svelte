<script lang="ts">
  import TextWithHoverTooltip from "@21n/elements/text/TextWithHoverTooltip.svelte";
  import { textTruncateMapper } from "@21n/utils/utils";
  let {
    hierarchy = [],
    slice = undefined,
    truncateLength = 15,
    onclick = void 0
  }: {
    hierarchy?: string[];
    slice?: number | undefined;
    truncateLength?: number;
    onclick?: ((event: MouseEvent) => void) | undefined;
  } = $props();
  const val = $derived(
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
          .join(" ・ ")
  );
</script>

{#if hierarchy?.length > 0}
  <div class="text-start text-b4 truncate" {onclick}>
    <TextWithHoverTooltip text={val} tooltip={hierarchy.join(" ・ ")} />
  </div>
{/if}
