<script lang="ts">
  import ComingSoonView from "$lib/client/elements/ComingSoonView.svelte";
  import Text from "$lib/client/elements/text/Text.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import { TextStyle } from "$lib/client/types/text.enum";
</script>

<div class="bg-bgs2 rounded-md p-4 pb-8">
  <Text content="Insights" style={TextStyle.PANEL_HEADING_SMALL} />
  <ComingSoonView size={Size.sm} />
</div>
