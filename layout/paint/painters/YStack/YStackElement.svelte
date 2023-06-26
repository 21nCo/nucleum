<script lang="ts">
  import { onMount } from "svelte";
  import ComponentResolver from "../../ComponentResolver.svelte";
  import { TextType } from "$lib/tidy/types/text.enum";
  import Text from "$lib/tidy/elements/text/Text.svelte";
  import { getComponentFromPath } from "$lib/tidy/utils/utils";
  import {
    BlockType,
    type ComponentType,
  } from "$lib/tidy/types/component.type";

  export let path: string;
  export let params: any = {};
  let component: ComponentType | undefined = getComponentFromPath(path);
</script>

{#if component && component.heading && component.type === BlockType.SECTION}
  <Text type={TextType.SECTION_HEADING}>{component.heading.toUpperCase()}</Text>
{/if}
<ComponentResolver {path} {params} />
