<script lang="ts">
  import { onMount } from "svelte";
  import ComponentResolver from "../../ComponentResolver.svelte";
  import { TextType } from "$lib/tidy/types/text.enum";
  import Text from "$lib/tidy/elements/text/Text.svelte";
  import { resolveComponentFromPath } from "$lib/tidy/utils/utils";
  import { BlockType, type Action } from "$lib/tidy/types/action.type";

  export let path: string;
  export let params: any = {};
  let component: Action | undefined = resolveComponentFromPath(path);
</script>

{#if component && component.label && component.type === BlockType.SECTION}
  <Text style={TextType.SECTION_HEADING}>{component.label.toUpperCase()}</Text>
{/if}
<ComponentResolver {path} {params} />
