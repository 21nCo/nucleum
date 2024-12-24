<script lang="ts">
  import InlineInfoBanner from "$lib/client/elements/text/InlineInfoBanner.svelte";
  import { userPreferences } from "$lib/client/components/settings/userPreferences.store";
  import { InfoTextType } from "$lib/client/types/text.type";
  import { formatDatetime } from "$lib/client/utils/time.utils";
  import Icon from "$lib/client/elements/Icon.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import type { ActiveResourceStore } from "$lib/client/components/flux/resourceStores/resource.store";
  import { renderMdAsHtml } from "$lib/client/components/markdown/markdown.utils";
  export let resource: ActiveResourceStore<any, any>;
</script>

{#if $resource.trashInformation || $resource.isArchived || $resource.isLocked || $resource.isInReadOnlyMode}
  <div class="flex flex-col gap-4">
    {#if $resource.trashInformation}
      <InlineInfoBanner
        type={InfoTextType.ERROR}
        icon="ph:trash-light"
        content={"This resource was moved to trash on: *" +
          formatDatetime(
            $userPreferences,
            new Date($resource.trashInformation.deletedAt)
          ) +
          "*"}
        action={{
          label: "Restore",
          callback: async () => {
            return resource.restore();
          }
        }}
      />
    {/if}
    {#if $resource.isArchived}
      <InlineInfoBanner
        type={InfoTextType.INFO}
        icon="ph:archive-light"
        content={"This resource was archived on: *" +
          formatDatetime($userPreferences, new Date($resource.modifiedAt)) +
          "*"}
        action={{
          label: "Unarchive",
          callback: async () => {
            return resource.unarchive();
          }
        }}
      />
    {/if}
    {#if $resource.isLocked}
      <div
        class="flex justify-between gap-2 bg-aps3 border-2 border-dotted border-aps2 rounded-md p-2 px-4 text-b2 text-aps1"
      >
        <span class="flex items-center gap-2">
          <Icon icon="ph:lock" class="stroke-aps1" size={Size.sm} />
          <span
            >Locked for editing -
            {@html renderMdAsHtml(
              "*" +
                formatDatetime(
                  $userPreferences,
                  new Date($resource.modifiedAt)
                ) +
                "*"
            )}
          </span>
        </span>
        <button
          class="text-b3 font-medium underline"
          on:click={() => {
            resource.toggleLock(false);
          }}>Unlock</button
        >
      </div>
    {:else if $resource.isInReadOnlyMode}
      <div
        class="flex justify-between gap-2 bg-bgs2 border-2 border-dotted border-brs3 rounded-md p-2 px-4 text-b2"
      >
        <span class="flex items-center gap-2">
          <Icon icon="ph:book-open-light" size={Size.sm} />
          <span>Read mode is turned on</span>
        </span>
        <button
          class="text-b3 font-medium underline"
          on:click={() => {
            resource.toggleReadMode(false);
            // floatingBarRef?.resetToggle();
          }}>turn off</button
        >
      </div>
    {/if}
  </div>
{/if}
