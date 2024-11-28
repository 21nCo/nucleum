<script lang="ts">
  import InlineInfoBanner from "$lib/client/elements/text/InlineInfoBanner.svelte";
  import { userPreferences } from "$lib/client/components/settings/userPreferences.store";
  import { InfoTextType } from "$lib/client/types/text.type";
  import { formatDatetime } from "$lib/client/utils/time.utils";
  import Icon from "$lib/client/elements/Icon.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import type { ActiveResourceStore } from "$lib/client/components/flux/resourceStores/resource.store";
  export let resource: ActiveResourceStore<any, any>;
</script>

{#if $resource.trashInformation}
  <div class="px-4">
    <InlineInfoBanner
      type={InfoTextType.ERROR}
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
  </div>
{/if}
{#if $resource.isArchived}
  <div class="px-4">
    <InlineInfoBanner
      type={InfoTextType.INFO}
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
  </div>
{/if}
{#if $resource.isLocked}
  <div
    class="flex justify-center gap-2 bg-bgs2 border-2 border-dotted border-brs3 rounded-md p-2 text-b2 mx-12"
  >
    <Icon icon="ph:lock-thin" size={Size.sm} />
    <span>Locked for editing</span>
    <button
      class="text-b4 font-medium underline"
      on:click={() => {
        resource.toggleLock(false);
      }}>Unlock</button
    >
  </div>
{:else if $resource.isInReadOnlyMode}
  <div
    class="flex justify-center gap-2 bg-bgs2 border-2 border-dotted border-brs3 rounded-md p-2 text-b2 mx-12"
  >
    <Icon icon="book-open" size={Size.sm} />
    <span>Read mode</span>
    <button
      class="text-b4 font-medium underline"
      on:click={() => {
        resource.toggleReadMode(false);
        // floatingBarRef?.resetToggle();
      }}>turn off</button
    >
  </div>
{/if}
