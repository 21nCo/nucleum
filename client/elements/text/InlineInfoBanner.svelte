<script lang="ts">
  import { renderMdAsHtml } from "$lib/client/components/markdown/markdown.utils";
  import { appStore } from "$lib/client/stores/app.store";
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
  class={cn("flex justify-between w-full rounded-md gap-4 p-4 text-b2", {
    "bg-aps3": type === InfoTextType.INFO,
    "bg-ars2": type === InfoTextType.ERROR,
    "bg-ass3": type !== InfoTextType.INFO && type !== InfoTextType.ERROR
  })}
>
  <span class="flex gap-2 items-center">
    <Icon
      icon={type === InfoTextType.ERROR ? "help" : type}
      class={cn({
        "stroke-ars1": type === InfoTextType.ERROR,
        "text-aps1": type === InfoTextType.INFO
      })}
    />
    {#if content}
      <div class="text-left">
        {@html renderMdAsHtml(content)}
      </div>
    {:else}
      <slot />
    {/if}
  </span>
  {#if action}
    <div class="text-b3">
      {#if action.action}
        <Link
          label="Learn more"
          on:click={() => {
            if (action.action) appStore.runAction(action.action);
          }}
        />
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
