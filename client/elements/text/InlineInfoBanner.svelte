<script lang="ts">
  import { renderMdAsHtml } from "$lib/client/components/markdown/markdown.utils";
  import {
    ButtonVariant,
    type IButtonParams
  } from "$lib/client/types/button.type";
  import { Size } from "$lib/client/types/size.enum";
  import { InfoTextType } from "$lib/client/types/text.type";
  import { cn } from "$lib/client/utils/ui.utils";
  import Icon from "../Icon.svelte";
  import Button from "../button/Button.svelte";
  import Link from "./Link.svelte";
  export let content: string | undefined = undefined;
  export let type: InfoTextType = InfoTextType.INFO;
  export let action: IButtonParams | undefined = undefined;
</script>

<div
  class={cn("flex w-full rounded-md gap-4 p-4 text-b2", {
    "bg-bgs2": type === InfoTextType.INFO,
    "bg-ars2": type === InfoTextType.ERROR,
    "bg-aps2": type === InfoTextType.WARNING
  })}
>
  <Icon
    icon={type === InfoTextType.ERROR ? "help" : `ph:${type}-light`}
    class={cn({
      "stroke-ars1": type === InfoTextType.ERROR,
      "stroke-fgs1": type === InfoTextType.INFO
    })}
  />
  <div class="flex flex-col items-start gap-2">
    {#if content}
      <div class="text-left">
        {@html renderMdAsHtml(content)}
      </div>
    {:else}
      <slot />
    {/if}
    {#if action}
      <div class="text-b3">
        {#if action.action}
          <Link label={action.label ?? "Learn more"} href={action.action} />
        {:else}
          <Button
            size={action.size ?? Size.xs}
            label={action.label}
            type={type === InfoTextType.ERROR
              ? ButtonVariant.DANGER
              : ButtonVariant.PRIMARY}
            on:click={() => {
              if (action.callback) action.callback();
            }}
          />
        {/if}
      </div>
    {/if}
  </div>
</div>
