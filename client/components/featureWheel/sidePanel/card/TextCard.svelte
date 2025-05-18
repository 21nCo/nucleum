<script lang="ts">
  import Button from "$lib/client/landing/shared/elements/Button.svelte";
  import { renderMdAsHtml } from "../../../markdown/markdown.utils";

  export let title: string;
  export let content: string | undefined = undefined;
  export let learnMoreLink: string | undefined = undefined;
  export let image: string | undefined = undefined;
</script>

<div class="flex flex-col gap-2 p-4 bg-bgs1 rounded-md">
  <div class="text-h5 font-medium">{title}</div>
  <slot>
    <div class="flex gap-2 justify-between">
      {#if content}
        <div class="flex flex-col gap-2 h-full justify-between">
          <div class="text-fgs2 text-b2">
            {@html renderMdAsHtml(content)}
          </div>
          {#if learnMoreLink}
            <div>
              <Button
                label="Learn more"
                href={learnMoreLink}
                type="secondary"
                isShort
              />
            </div>
          {/if}
        </div>
      {/if}
      {#if image}
        <img
          src={image}
          alt={title}
          class="object-cover w-80 h-40 rounded-md"
        />
      {/if}
    </div>
  </slot>
</div>
