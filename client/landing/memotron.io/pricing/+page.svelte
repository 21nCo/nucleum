<script lang="ts">
  import { renderMdAsHtml } from "$lib/client/components/markdown/markdown.utils";

  const text = `As a small and independant team, we are always looking for ways to improve Memotron and make it more accessible to everyone. Our priority was to build a fantastic & useful product first and then think about how to make it sustainable. In the past several months, we just did that and we are now ready to start sharing it with you. 
  
  We are working on making the cloud sync plan sustainable and we will be rolling out a paid plan in the coming months. Rest assured, the offline version of the app will remain free forever for everyone to use.`;
</script>

<div class="flex flex-col gap-8 items-center h-screen p-3 mb-32">
  <div class="text-h1">Pricing</div>
  <div class="flex flex-col gap-7 w-full max-w-3xl">
    <div
      class="bg-bgs2 rounded-[20px] mo:text-base text-h4 p-7 flex flex-col gap-4 w-full"
    >
      <div class="w-full">
        {@html renderMdAsHtml(text)}
      </div>
      <div>
        <div class="text-fgs2 text-b2 w-full justify-end">- Team Memotron</div>
      </div>
      <a
        class="text-aps1 text-b2 w-full justify-end mt-8"
        target="_blank"
        href="https://papers.21n.io/soft">Read our white paper</a
      >
    </div>
  </div>
</div>
