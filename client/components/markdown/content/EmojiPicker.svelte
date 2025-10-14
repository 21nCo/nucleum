<script lang="ts">
  import { emojis } from "$lib/client/data/avatars";
  import { userPreferences } from "$lib/client/components/settings/userPreferences.store";
  import { createEventDispatcher, onMount } from "svelte";
  import { cn } from "$lib/client/utils/ui.utils";

  const dispatch = createEventDispatcher();

  export let searchQuery: string = "";
  export let isPopoverContext: boolean = false;

  let activeCategory: string = "";
  let emojisWithCategories: any = {
    "Frequently Used": [],
    ...emojis
  };

  let storeEmojis = emojisWithCategories;
  let storeEmojisKey = Object.keys(storeEmojis);

  let displayEmojis: any = {};
  let emojisParentContainer: HTMLDivElement;
  let selectedIndex = 0;
  let flatEmojiList: any[] = [];

  $: {
    flatEmojiList = [];
    Object.entries(displayEmojis).forEach(([category, emojiList]: [string, any]) => {
      if (Array.isArray(emojiList)) {
        emojiList.forEach((emoji) => {
          flatEmojiList.push(emoji);
        });
      }
    });
  }

  $: {
    filterEmojis(searchQuery);
  }

  function updateUsedEmojis(prefs: any) {
    storeEmojis["Frequently Used"] = prefs.avatarPicker.usedEmojis
      ?.slice(0, 20)
      .filter((emote: any) => emote[0]?.frequency > 2);
  }

  onMount(() => {
    const userPrefSub = userPreferences.subscribe((prefs) => {
      updateUsedEmojis(prefs);
    });
    return () => {
      if (userPrefSub) userPrefSub();
    };
  });

  function filterEmojis(query: string) {
    const searchValue = query.trim().toLowerCase();
    if (!searchValue) {
      displayEmojis = {};
      selectedIndex = 0;
      return;
    }
    
    let tempEmojis: any = {};
    for (let key of storeEmojisKey) {
      const emojiList = storeEmojis[key as keyof typeof storeEmojis];
      if (!emojiList) continue;
      
      for (let emoji of emojiList) {
        let emojiName = emoji[0]?.name?.toLowerCase();
        if (emojiName && emojiName.includes(searchValue)) {
          if (tempEmojis[key] === undefined) tempEmojis[key] = [];
          tempEmojis[key].push(emoji);
        }
      }
    }
    displayEmojis = tempEmojis;
    selectedIndex = 0;
  }

  function addToUsedList(emoji: any) {
    let index = $userPreferences.avatarPicker.usedEmojis?.findIndex((el) => {
      return (
        el[0].name === emoji.name &&
        (("file" in el[0] && el[0].file !== undefined) ||
          ("code" in el[0] && el[0].code === emoji.code))
      );
    });
    if (index === -1) {
      let tempEmoji = { ...emoji };
      tempEmoji.frequency = 1;
      $userPreferences.avatarPicker.usedEmojis = [
        ...$userPreferences.avatarPicker.usedEmojis,
        [tempEmoji]
      ];
    } else {
      $userPreferences.avatarPicker.usedEmojis[index][0].frequency++;
    }

    $userPreferences.avatarPicker.usedEmojis.sort(
      (a, b) => b[0].frequency - a[0].frequency
    );
  }

  function itemClickHandler(emoji: any) {
    const selectedEmoji = emoji.length === 1 ? emoji[0] : emoji[0];
    addToUsedList(selectedEmoji);
    dispatch("select", { emoji: selectedEmoji });
  }

  export function key(key: string) {
    if (key === "ArrowDown") {
      selectedIndex = Math.min(selectedIndex + 1, flatEmojiList.length - 1);
      scrollToSelected();
    } else if (key === "ArrowUp") {
      selectedIndex = Math.max(selectedIndex - 1, 0);
      scrollToSelected();
    } else if (key === "Enter") {
      if (flatEmojiList[selectedIndex]) {
        itemClickHandler(flatEmojiList[selectedIndex]);
      }
    }
  }

  function scrollToSelected() {
    const selectedElement = document.querySelector(
      `.emoji-item[data-index="${selectedIndex}"]`
    );
    if (selectedElement && emojisParentContainer) {
      selectedElement.scrollIntoView({
        block: "nearest",
        behavior: "smooth"
      });
    }
  }
</script>

<div class="flex flex-col bg-bgs1 max-h-64 w-64">
  <div
    bind:this={emojisParentContainer}
    class="flex-1 overflow-y-auto p-2"
  >
    {#if Object.keys(displayEmojis).length === 0}
      <div class="text-center text-fgs3 py-4 text-b3">No emojis found</div>
    {:else}
      {@const emojiKeys = Object.keys(displayEmojis)}
      {#each emojiKeys as category, categoryIndex}
        {#if displayEmojis[category] && displayEmojis[category].length > 0}
          <div
            class="emoji-category mb-3"
            id={"EMOJI" + categoryIndex}
          >
            <div class="text-b4 font-medium text-fgs2 mb-1 px-1">
              {category}
            </div>
            <div class="grid grid-cols-8 gap-0.5">
              {#each displayEmojis[category] as emoji, emojiIndex}
                {@const globalIndex = flatEmojiList.indexOf(emoji)}
                <button
                  class={cn(
                    "emoji-item p-1 text-lg rounded hover:bg-bgs2 transition-colors cursor-pointer flex items-center justify-center",
                    {
                      "bg-bgs2 ring-1 ring-aps1": globalIndex === selectedIndex
                    }
                  )}
                  data-index={globalIndex}
                  on:click={() => itemClickHandler(emoji)}
                  title={emoji[0]?.name}
                >
                  {@html emoji[0]?.code}
                </button>
              {/each}
            </div>
          </div>
        {/if}
      {/each}
    {/if}
  </div>
</div>
