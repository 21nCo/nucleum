<script lang="ts">
  import AvatarView from "$lib/client/elements/avatarPicker/AvatarView.svelte";
  import { dataManager } from "$lib/client/persistence/dataManager";
  import type { IAvatar } from "$lib/client/types/avatar.type";
  import { Size } from "$lib/client/types/size.enum";
  import { cn } from "$lib/client/utils/ui.utils";
  import { onMount } from "svelte";
  import { get } from "svelte/store";
  export let types: string[] | undefined = undefined;
  let avatars: IAvatar[] = [];
  onMount(async () => {
    if (types) await resolveAvatars(types);
  });
  async function resolveAvatars(types: string[]) {
    if (!types) return;
    const dexie = get(dataManager).cacheSource.dexie;
    const typesWithDetails = await dexie.collection
      .where("id")
      .anyOf(types)
      .toArray();
    if (typesWithDetails) return typesWithDetails?.map((x) => x.avatar);
  }
  $: console.log({ avatars });
</script>

<div class="flex">
  {#each avatars as avatar, index (avatar)}
    <div
      class={cn({
        "-ml-2": index !== 0
      })}
    >
      <AvatarView {avatar} size={Size.md} />
    </div>
  {/each}
</div>
