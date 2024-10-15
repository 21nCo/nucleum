<script lang="ts">
  import Button from "$lib/client/elements/button/Button.svelte";
  import { appStore } from "$lib/client/stores/app.store";
  import { ButtonStyle, ButtonVariant } from "$lib/client/types/button.type";
  import { Size } from "$lib/client/types/size.enum";
  export let context: "Roadmap" | "Changelog" | "Board";
  $: baseUrl =
    $appStore?.appData?.urls?.hashnode ??
    `https://${$appStore.product}.hashnode.space`;
</script>

<!-- <SupaHubEmbedCode {context} /> -->
<div class="realtive w-full h-full rounded-md">
  <iframe
    title="Hashnode"
    class="rounded-md"
    src="{baseUrl}/{context?.toLocaleLowerCase() ?? ''}"
    width="100%"
    height="100%"
    frameBorder="0"
  ></iframe>

  <div class="absolute bottom-0 left-0 m-2 flex gap-2 items-center">
    <Button
      label="Open in browser"
      icon="arrow-up-right"
      size={Size.sm}
      type={ButtonVariant.PRIMARY}
      style={ButtonStyle.OUTLINED}
      on:click={() => {
        appStore.openLink(baseUrl);
      }}
    />
  </div>
</div>
