<script lang="ts">
  import { logger } from "$lib/client/components/debug/logger.client";
  import Button from "$lib/client/elements/button/Button.svelte";
  import TextInput from "$lib/client/elements/input/TextInput.svelte";
  import { toasts } from "$lib/client/stores/notification.store";
  import { linkTagStore } from "./link.store";
  import LinkTagsGroup from "./LinkTagsGroup.svelte";
  let inputValue: string = "";

  async function save(params: { prefix: string; label: string }) {
    let prefix = params.prefix;
    let label = params.label;
    if (!params) {
      if (inputValue.includes(":")) {
        prefix = inputValue.split(":")[0];
        label = inputValue.split(":")[1];
      } else {
        label = inputValue;
      }
    }
    let result = await linkTagStore.create({
      label,
      prefix
    });
    logger.debug({ at: "LinkTagsControlPanel", result });
    if (result) {
      toasts.success(`**${label}** added to link tags`);
    }
    inputValue = "";
  }

  $: groups = linkTagStore.transform($linkTagStore);
  $: console.log({ groups });
</script>

<div class="flex flex-col gap-12 w-full h-full">
  <div class="w-full flex gap-2">
    <TextInput bind:value={inputValue} placeholder="Type tag or prefix:tag" />
    <Button label="Save" on:click={() => save()} />
  </div>
  <div class="flex flex-col gap-6">
    {#each groups as group}
      <LinkTagsGroup {group} on:save={(e) => save(e.detail)} />
    {/each}
  </div>
</div>
