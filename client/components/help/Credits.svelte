<script lang="ts">
  import CreditSection from "./CreditSection.svelte";

  interface CreditItem {
    name: string;
    description: string;
    link: string;
  }

  const libraries: CreditItem[] = [
    {
      name: "G6 graph library",
      description: "Graph visualization engine by Ant",
      link: "https://g6.antv.vision/en"
    },
    {
      name: "PDF.js",
      description: "PDF viewer built with web standards",
      link: "https://mozilla.github.io/pdf.js/"
    },
    {
      name: "Hugging Face",
      description: "Open-source machine learning platform",
      link: "https://huggingface.co/"
    },
    {
      name: "Iconify",
      description: "Icon framework with thousands of icons",
      link: "https://iconify.design/"
    },
    {
      name: "Storybook",
      description: "UI component development environment",
      link: "https://storybook.js.org/"
    },
    {
      name: "Tauri",
      description: "Build smaller, faster, more secure desktop apps",
      link: "https://tauri.app/"
    },
    {
      name: "Plasmo",
      description: "Browser extension framework",
      link: "https://www.plasmo.com/"
    },
    {
      name: "Monaco Editor",
      description: "The VS Code editor is available as a component",
      link: "https://microsoft.github.io/monaco-editor/"
    },
    {
      name: "D3.js",
      description: "JavaScript library for data visualizations",
      link: "https://d3js.org/"
    },
    {
      name: "Wavesurfer.js",
      description: "Audio visualization library",
      link: "https://wavesurfer-js.org/"
    }
  ];

  const frameworks: CreditItem[] = [
    {
      name: "Svelte",
      description: "Cybernetically enhanced web apps",
      link: "https://svelte.dev/"
    },
    {
      name: "Vite",
      description: "Next generation frontend tooling",
      link: "https://vitejs.dev/"
    },
    {
      name: "Tailwind",
      description: "Utility-first CSS framework",
      link: "https://tailwindcss.com/"
    },
    {
      name: "SurrealDB",
      description: "Cloud-native multi-model database",
      link: "https://surrealdb.com/"
    },
    {
      name: "Node.js",
      description: "JavaScript runtime environment",
      link: "https://nodejs.org/"
    },
    {
      name: "VS Code",
      description: "The status-quo code editor",
      link: "https://code.visualstudio.com/"
    }
  ];

  const design: CreditItem[] = [
    {
      name: "Phosphor Icons",
      description: "Flexible icon family for interfaces",
      link: "https://phosphoricons.com/"
    },
    {
      name: "IllustrationKit",
      description: "Premium handcrafted illustrations",
      link: "https://illustrationkit.com/"
    },
    {
      name: "Space Grotesk",
      description: "A geometric sans-serif typeface",
      link: "https://github.com/floriankarsten/space-grotesk"
    }
  ];
</script>

<div class="flex flex-col gap-6 w-full h-full p-6 overflow-auto">
  <div class="flex flex-col gap-8">
    <div class="flex justify-center mt-4">
      <div class="text-fgs3 text-b3 text-center">
        Thanks to all of these amazing ❤️ open source projects that made this
        application possible.
      </div>
    </div>
    <CreditSection title="Design" items={design} />
    <CreditSection title="Libraries" items={libraries} />
    <CreditSection title="Frameworks & Tools" items={frameworks} />
  </div>
</div>
