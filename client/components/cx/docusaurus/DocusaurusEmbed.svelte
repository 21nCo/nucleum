<script lang="ts">
  import Button from "$lib/client/elements/button/Button.svelte";
  import { appStore } from "$lib/client/stores/app.store";
  import { ButtonStyle, ButtonVariant } from "$lib/client/types/button.type";
  import { Size } from "$lib/client/types/size.enum";
  export let context: "docs" | "roadmap" | "changelog" | "faqs";
  $: url = $appStore?.appData?.urls?.[context] ?? "";
  $: console.log({ url, context });
</script>

<div class="realtive w-full h-full rounded-md">
  <iframe
    title="Docs"
    class="rounded-md"
    src={url}
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
        appStore.openLink(url);
      }}
    />
  </div>
</div>
