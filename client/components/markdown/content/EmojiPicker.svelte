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
      flatEmojiList = [];
      selectedIndex = 0;
      return;
    }
    
    let tempEmojis: any = {};
    let tempFlatList: any[] = [];
    let totalCount = 0;
    const maxResults = 50;
    
    for (let key of storeEmojisKey) {
      if (totalCount >= maxResults) break;
      
      const emojiList = storeEmojis[key as keyof typeof storeEmojis];
      if (!emojiList) continue;
      
      for (let emoji of emojiList) {
        if (totalCount >= maxResults) break;
        
        let emojiName = emoji[0]?.name?.toLowerCase();
        if (emojiName && emojiName.includes(searchValue)) {
          if (tempEmojis[key] === undefined) tempEmojis[key] = [];
          tempEmojis[key].push(emoji);
          tempFlatList.push(emoji);
          totalCount++;
        }
      }
    }
    displayEmojis = tempEmojis;
    flatEmojiList = tempFlatList;
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

  function getCategoryForEmoji(emoji: any): string {
    for (const [category, emojiList] of Object.entries(displayEmojis)) {
      if (Array.isArray(emojiList) && emojiList.includes(emoji)) {
        return category;
      }
    }
    return "";
  }
</script>

<div class="flex flex-col bg-bgs1 max-h-80 w-full shadow-lg rounded-md border border-brs1">
  <div
    bind:this={emojisParentContainer}
    class="flex-1 overflow-y-auto py-1"
  >
    {#if flatEmojiList.length === 0}
      <div class="text-center text-fgs3 py-4 text-b3">
        No emojis found
      </div>
    {:else}
      {#each flatEmojiList as emoji, index}
        <button
          class={cn(
            "emoji-item w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-bgs2 transition-colors cursor-pointer",
            {
              "bg-bgs2": index === selectedIndex
            }
          )}
          data-index={index}
          on:click={() => itemClickHandler(emoji)}
        >
          <span class="text-lg flex-shrink-0">
            {@html emoji[0]?.code}
          </span>
          <span class="text-b3 text-fgs2 truncate">
            {emoji[0]?.name}
          </span>
        </button>
      {/each}
    {/if}
  </div>
</div>
