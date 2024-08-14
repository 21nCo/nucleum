<script lang="ts">
  import ComingSoonView from "$lib/client/elements/ComingSoonView.svelte";
  import OptionSelector from "$lib/client/elements/select/OptionSelector.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import type { IActiveNodeStore } from "../node.store";

  export let node: IActiveNodeStore;
</script>

<OptionSelector
  options={[
    {
      value: "Bookmarks",
      icon: "bookmark"
    },
    {
      value: "Comments",
      icon: "chat-bubble-bottom-center"
    },
    {
      value: "Tasks",
      icon: "rocket"
    },
    {
      value: "Outgoing mentions",
      icon: "at-symbol"
    }
  ]}
  size={Size.sm}
/>

<ComingSoonView size={Size.sm} />
