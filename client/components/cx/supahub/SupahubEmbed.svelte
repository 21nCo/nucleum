<script lang="ts">
  import Button from "@21n/elements/button/Button.svelte";
  import { appStore } from "@21n/stores/app.store";
  import { ButtonStyle, ButtonVariant } from "@21n/types/button.type";
  import { Size } from "@21n/types/size.enum";
  export let context: "Roadmap" | "Changelog" | "Board";
  $: baseUrl =
    $appStore?.appData?.urls?.supahub ??
    `https://${$appStore.product}.supahub.com`;

  $: url =
    context === "Roadmap" && $appStore?.appData?.urls?.roadmapEmbed
      ? $appStore?.appData?.urls?.roadmapEmbed
      : `${baseUrl}/${context.toLocaleLowerCase()}`;
</script>

<!-- <SupaHubEmbedCode {context} /> -->
<div class="realtive w-full h-full rounded-md">
  <iframe
    title="Supahub"
    class="rounded-md"
    src={url}
    width="100%"
    height="100%"
    frameBorder="0"
  ></iframe>

  <div class="absolute bottom-0 left-0 m-2 flex gap-2 items-center">
    <Button
      label="Open in browser"
      icon="weblink"
      size={Size.sm}
      type={ButtonVariant.PRIMARY}
      style={ButtonStyle.OUTLINED}
      on:click={() => {
        appStore.openLink(baseUrl);
      }}
    />
  </div>
</div>
