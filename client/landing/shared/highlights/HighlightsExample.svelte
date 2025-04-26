<script lang="ts">
  import Highlights from "./Highlights.svelte";
  import type { IHighlight } from "../Landing.types";

  // Example highlights data
  const highlights: IHighlight[] = [
    {
      icon: "star",
      title: "Unbelievably powerful",
      desc: "Unlock next-level productivity with a powerhouse of features designed to get things done",
      visualRenderComponent: "CollectionsGraph"
    },
    {
      icon: "brain",
      title: "AI native",
      desc: "Seamlessly integrate your data and harness cutting-edge AI with our custom MCP server",
      visualRenderComponent: "ainative",
      isVisualAtBottom: true
    },
    {
      icon: "cloud",
      title: "Offline",
      desc: "No cloud required. If your OS runs, so does this",
      visualRenderComponent: "NetworkIcon",
      isVisualAtBottom: true
    },
    {
      icon: "lock",
      title: "Zero-trust security & ownership",
      desc: "If you opt for managed cloud sync, your data is encrypted from start to finish - only you can access it. Even better, you can host your data on your preferred servers or run locally.",
      visualRenderComponent: "security",
      isVisualAtBottom: true
    },
    {
      icon: "infinity",
      title: "Built to last",
      desc: "No exits. No acquisitions. We're not building for an exit. We're building for you",
      visualRenderComponent: "last"
    },
    {
      icon: "hand-touch",
      title: "Surprisingly intuitive",
      desc: "A clean, elegant interface that makes powerful features feel effortless",
      visualRenderComponent: "UIVisual",
      isVisualAtBottom: true
    }
  ];
</script>

<div class="w-full py-12">
  <Highlights {highlights} />
</div>
