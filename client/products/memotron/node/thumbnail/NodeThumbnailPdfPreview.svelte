<script lang="ts">
  import { hideOnOverlay } from "@21n/actions/embed.actions";
  import context from "@21n/stores/context.store";

  export let url: string = "";
</script>

<button
  class="pdf-thumbnail userdata absolute inset-0 w-full h-full overflow-clip rounded-t-md"
  on:click
>
  <!-- <object
    data={url + "#toolbar=0&navpanes=0&scrollbar=0&page=1"}
    type="application/pdf"
    width="100%"
    height="100%"
    class="shadow-md overflow-clip rounded-t-md"
    title="PDF Preview"
  >
    <span class="text-fgs3 text-b2"> Preview not available </span>
  </object> -->
  <!-- <embed
    src={url + "#toolbar=0&navpanes=0&scrollbar=0&page=1"}
    width="100%"
    height="100%"
    class="shadow-md overflow-clip rounded-t-md"
    title="PDF Preview"
  /> -->
  <iframe
    use:hideOnOverlay={{
      enabled: $context.isEmbed
    }}
    src={url + "#toolbar=0&navpanes=0&scrollbar=0&page=1"}
    width="100%"
    height="100%"
    class="shadow-md overflow-clip rounded-t-md"
    title="PDF Preview"
    allowfullscreen
  ></iframe>
  <div
    class="absolute inset-0 w-full h-full bg-gradient-to-b from-transparent via-bgs1/5 to-bgs1"
  ></div>
</button>

<style>
  .pdf-thumbnail {
    aspect-ratio: 3/4;
    max-width: 100%;
    max-height: 100%;
  }
  @media not all and (min-resolution: 0.001dpcm) {
    @supports (-webkit-appearance: none) {
      .pdf-thumbnail {
        -webkit-user-select: none;
        user-select: none;
      }
    }
  }
</style>
