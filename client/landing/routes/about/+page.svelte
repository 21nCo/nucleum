<script lang="ts">
  import MarkdownRenderer from "@21n/landing/shared/elements/MarkdownRenderer.svelte";

  const text = `
  In our age of unprecedented information access and potential for intellectual growth, **digital memory and thinking tools** have become invaluable for optimizing cognitive capabilities and enhancing quality of life. The future of these tools brims with exciting potential to unlock new dimensions of serendipity, creativity, reflection and collaboration.
        
    We want to build **Memotron** as a revolutionary digital memory tool that offers a **holistic, intuitive, and technologically advanced** approach to thinking and learning. We want Memotron to seamlessly integrate into users' daily lives, providing a powerful external memory aid that supports cognitive processes, enhances creativity, promotes personal growth, and contributes to overall well-being.
    
    We want to redefine what a digital memory and thinking tool should be, and we want it to be unbelievably powerful, insanely reliable, and surprisingly intuitive.`;
</script>

<div class="flex flex-col gap-8 items-center h-screen p-3 mb-32">
  <div class="text-h1">Our mission</div>
  <div class="flex flex-col gap-7 w-full max-w-3xl">
    <div
      class="bg-bgs2 rounded-[20px] mo:text-base text-h4 p-7 flex flex-col gap-4 w-full"
    >
      <div class="w-full">
        <MarkdownRenderer {text} />
      </div>
      <div>
        <div class="text-fgs2 text-b2 w-full justify-end">- Team Memotron</div>
      </div>
    </div>
  </div>
</div>
