<script lang="ts">
  import Button from "$lib/client/elements/button/Button.svelte";
  import Text from "$lib/client/elements/text/Text.svelte";
  import { ButtonStyle } from "$lib/client/types/button.type";
  import { Size } from "$lib/client/types/size.enum";
  import { TextStyle } from "$lib/client/types/text.enum";
  import { TimeScaleUnit } from "$lib/client/types/time.type";
  export let scale: TimeScaleUnit;
  export let description: string | null = null;
  export let onEdit: () => void;
  const title =
    scale === TimeScaleUnit.DAY
      ? "Daily notes"
      : scale === TimeScaleUnit.MONTH
        ? "Monthly notes"
        : "Yearly notes";
  const defaultDescription = `Customize the template used when creating new ${title.toLowerCase()}`;
</script>

<div
  class="flex flex-col gap-8 items-center justify-between p-4 rounded-md border border-brs2 bg-bgs2 min-w-64 max-w-96"
>
  <div class="flex flex-col gap-3 items-start w-full">
    <Text content={title} style={TextStyle.FORM_LABEL} />
    <span class="text-b2 text-fgs3">{description || defaultDescription}</span>
  </div>
  <Button
    style={ButtonStyle.OUTLINED}
    size={Size.sm}
    label="Edit"
    isPreventMinWidth={true}
    icon="edit"
    on:click={onEdit}
  />
</div>
