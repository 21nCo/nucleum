<script lang="ts">
  import CreditSection from "./CreditSection.svelte";

  interface CreditItem {
    name: string;
    description: string;
    creator: string;
    link: string;
  }

  const libraries: CreditItem[] = [
    {
      name: "G6 graph library",
      description: "Graph visualization engine by Ant",
      creator: "AntV",
      link: "https://g6.antv.vision/en"
    },
    {
      name: "PDF.js",
      description: "PDF viewer built with web standards",
      creator: "Mozilla",
      link: "https://mozilla.github.io/pdf.js/"
    },
    {
      name: "Hugging Face",
      description: "Open-source machine learning platform",
      creator: "Hugging Face",
      link: "https://huggingface.co/"
    },
    {
      name: "Iconify",
      description: "Icon framework with thousands of icons",
      creator: "Vjacheslav Trushkin",
      link: "https://iconify.design/"
    },
    {
      name: "Storybook",
      description: "UI component development environment",
      creator: "Storybook Team",
      link: "https://storybook.js.org/"
    },
    {
      name: "Tauri",
      description: "Build smaller, faster, more secure desktop apps",
      creator: "Tauri Programme",
      link: "https://tauri.app/"
    },
    {
      name: "Plasmo",
      description: "Browser extension framework",
      creator: "Plasmo Corp",
      link: "https://www.plasmo.com/"
    },
    {
      name: "Monaco Editor",
      description: "The VS Code editor is available as a component",
      creator: "Microsoft",
      link: "https://microsoft.github.io/monaco-editor/"
    },
    {
      name: "D3.js",
      description: "JavaScript library for data visualizations",
      creator: "Mike Bostock",
      link: "https://d3js.org/"
    },
    {
      name: "Wavesurfer.js",
      description: "Audio visualization library",
      creator: "katspaugh",
      link: "https://wavesurfer-js.org/"
    }
  ];

  const frameworks: CreditItem[] = [
    {
      name: "Svelte",
      description: "Cybernetically enhanced web apps",
      creator: "Rich Harris",
      link: "https://svelte.dev/"
    },
    {
      name: "Vite",
      description: "Next generation frontend tooling",
      creator: "Evan You",
      link: "https://vitejs.dev/"
    },
    {
      name: "Tailwind",
      description: "Utility-first CSS framework",
      creator: "Tailwind Labs",
      link: "https://tailwindcss.com/"
    },
    {
      name: "SurrealDB",
      description: "Cloud-native multi-model database",
      creator: "SurrealDB",
      link: "https://surrealdb.com/"
    },
    {
      name: "Node.js",
      description: "JavaScript runtime environment",
      creator: "Ryan Dahl",
      link: "https://nodejs.org/"
    },
    {
      name: "VS Code",
      description: "The status-quo code editor",
      creator: "Microsoft",
      link: "https://code.visualstudio.com/"
    }
  ];

  const design: CreditItem[] = [
    {
      name: "Phosphor Icons",
      description: "Flexible icon family for interfaces",
      creator: "Helena Zhang & Tobias Fried",
      link: "https://phosphoricons.com/"
    },
    {
      name: "IllustrationKit",
      description: "Premium handcrafted illustrations",
      creator: "Khushmeen Sidhu",
      link: "https://illustrationkit.com/"
    }
  ];

  const fonts: CreditItem[] = [
    {
      name: "Sen",
      description: "A modern sans-serif typeface",
      creator: "Kosal Sen & Philatype",
      link: "https://fonts.google.com/specimen/Sen"
    },
    {
      name: "Space Grotesk",
      description: "A geometric sans-serif typeface",
      creator: "Florian Karsten",
      link: "https://github.com/floriankarsten/space-grotesk"
    },
    {
      name: "Hanken Grotesk",
      description: "A clean geometric sans-serif typeface",
      creator: "Alfredo Marco Pradil",
      link: "https://fonts.google.com/specimen/Hanken+Grotesk"
    },
    {
      name: "Sora",
      description: "A humanist sans-serif typeface",
      creator: "Jonathan Barnbrook",
      link: "https://fonts.google.com/specimen/Sora"
    },
    {
      name: "Inter",
      description: "A versatile typeface designed for UI",
      creator: "Rasmus Andersson",
      link: "https://fonts.google.com/specimen/Inter"
    },
    {
      name: "Poppins",
      description: "A geometric sans-serif typeface",
      creator: "Indian Type Foundry",
      link: "https://fonts.google.com/specimen/Poppins"
    },
    {
      name: "Montserrat",
      description: "A modern sans-serif typeface",
      creator: "Julieta Ulanovsky",
      link: "https://fonts.google.com/specimen/Montserrat"
    },
    {
      name: "Noto Sans",
      description: "A pan-Unicode typeface family",
      creator: "Google",
      link: "https://fonts.google.com/specimen/Noto+Sans"
    },
    {
      name: "Nunito",
      description: "A rounded sans-serif typeface",
      creator: "Vernon Adams",
      link: "https://fonts.google.com/specimen/Nunito"
    },
    {
      name: "Teachers",
      description: "A friendly sans-serif typeface",
      creator: "Artur Schmal",
      link: "https://fonts.google.com/specimen/Teachers"
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
    <CreditSection title="Fonts" items={fonts} />
    <CreditSection title="Libraries" items={libraries} />
    <CreditSection title="Frameworks & Tools" items={frameworks} />
  </div>
</div>
