<script lang="ts">
  import SvgIcon from "$lib/client/elements/SVGIcon.svelte";
  import Button from "$lib/client/landing/shared/elements/Button.svelte";
  import { renderMdAsHtml } from "../../../markdown/markdown.utils";

  export let title: string | undefined = undefined;
  export let content: string | undefined = undefined;
  export let learnMoreLink: string | undefined = undefined;
  export let image: string | undefined = undefined;
  export let icon: string | undefined = undefined;
</script>

<div class="flex gap-8 justify-between p-4 bg-bgs2 rounded-md">
  <div class="flex flex-col gap-2">
    {#if title}
      <div class="text-h5 font-medium">{title}</div>
    {/if}
    <slot>
      <div class="flex gap-2 justify-between">
        {#if content}
          <div class="flex flex-col gap-4 h-full justify-between">
            <div class="text-fgs2 text-b2">
              {@html renderMdAsHtml(content)}
            </div>
            {#if learnMoreLink}
              <div class="w-fit">
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
      </div>
    </slot>
    <slot name="additional" />
  </div>
  {#if image}
    <img src={image} alt={title} class="object-cover w-80 h-40 rounded-md" />
  {:else if icon}
    <div class="min-w-fit">
      <SvgIcon {icon} size="fit" />
    </div>
  {/if}
</div>
