<script lang="ts">
  import type { Snippet } from "svelte";
  import SvgIcon from "@21n/elements/SVGIcon.svelte";
  import Button from "@21n/landing/shared/elements/Button.svelte";
  import { renderMdAsHtml } from "@21n/components/markdown/markdown.utils";

  let {
    title = undefined,
    content = undefined,
    learnMoreLink = undefined,
    image = undefined,
    icon = undefined,
    children,
    additional
  }: {
    title?: string;
    content?: string;
    learnMoreLink?: string;
    image?: string;
    icon?: string;
    children?: Snippet;
    additional?: Snippet;
  } = $props();
</script>

<div class="flex gap-8 justify-between p-4 bg-bgs2 rounded-md">
  <div class="flex flex-col gap-2">
    {#if title}
      <div class="text-h5 font-medium">{title}</div>
    {/if}
    {#if children}
      {@render children()}
    {:else}
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
    {/if}
    {#if additional}
      {@render additional()}
    {/if}
  </div>
  {#if image}
    <img src={image} alt={title} class="object-cover w-80 h-40 rounded-md" />
  {:else if icon}
    <div class="min-w-fit">
      <SvgIcon {icon} size="fit" />
    </div>
  {/if}
</div>
