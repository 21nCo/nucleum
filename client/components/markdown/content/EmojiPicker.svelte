<script lang="ts">
  import { emojis } from "$lib/client/data/avatars";
  import { userPreferences } from "$lib/client/components/settings/userPreferences.store";
  import { createEventDispatcher, onMount } from "svelte";
  import { debouncer } from "$lib/client/utils/utils";
  import { cn } from "$lib/client/utils/ui.utils";
  import Icon from "$lib/client/elements/Icon.svelte";

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
  let storeEmojisKV = Object.entries(storeEmojis);

  let previousKVIndex = -1;
  let isLoadingMore = false;
  let lazyLoadedEmojis: any = {};
  let displayEmojis: any = {};
  let emojisParentContainer: HTMLDivElement;
  let searchRef: HTMLInputElement;
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

  function updateUsedEmojis(prefs: any) {
    storeEmojis["Frequently Used"] = prefs.avatarPicker.usedEmojis
      ?.slice(0, 20)
      .filter((emote: any) => emote[0]?.frequency > 2);
    lazyLoadedEmojis["Frequently Used"] = storeEmojis["Frequently Used"];
    displayEmojis = { ...lazyLoadedEmojis };
  }

  onMount(() => {
    lazyLoadEmojis();
    const userPrefSub = userPreferences.subscribe((prefs) => {
      updateUsedEmojis(prefs);
    });
    if (searchRef) {
      searchRef.focus();
    }
    return () => {
      if (userPrefSub) userPrefSub();
    };
  });

  async function lazyLoadEmojis() {
    if (isLoadingMore) return;
    isLoadingMore = true;

    try {
      if (previousKVIndex === -1) {
        const initialCategories = storeEmojisKV.slice(0, 3);
        for (const [category, emojiList] of initialCategories) {
          lazyLoadedEmojis[category] = (emojiList as any).slice(0, 50);
        }
        displayEmojis = { ...lazyLoadedEmojis };
        previousKVIndex = 2;
        return;
      }
      previousKVIndex++;
      if (previousKVIndex < storeEmojisKV.length) {
        const [category, emojiList] = storeEmojisKV[previousKVIndex];
        lazyLoadedEmojis[category] = (emojiList as any).slice(0, 50);
        displayEmojis = { ...lazyLoadedEmojis };
      }
    } finally {
      isLoadingMore = false;
    }
  }

  const handleScroll = debouncer(function () {
    const scrollBottom =
      emojisParentContainer.scrollTop + emojisParentContainer.clientHeight;

    if (
      scrollBottom + 100 >= emojisParentContainer.scrollHeight &&
      !isLoadingMore
    ) {
      lazyLoadEmojis();
    }

    const scrollTop = emojisParentContainer.scrollTop;
    const categoryContainers = document.querySelectorAll(".emoji-category");

    requestAnimationFrame(() => {
      categoryContainers.forEach((categoryContainer: any) => {
        const categoryContainerHeight = categoryContainer.offsetHeight;
        const categoryContainerTop = categoryContainer.offsetTop - 10;

        if (
          scrollTop > categoryContainerTop &&
          scrollTop < categoryContainerTop + categoryContainerHeight
        ) {
          activeCategory = categoryContainer.id;
        }
      });
    });
  }, 16);

  function onSearchInputHandler() {
    let searchValue = searchRef.value.trim().toLowerCase();
    if (searchValue === "") {
      displayEmojis = lazyLoadedEmojis;
      selectedIndex = 0;
      return;
    }
    let tempEmojis: any = {};
    for (let key of storeEmojisKey) {
      for (let emoji of storeEmojis[key as keyof typeof storeEmojis]) {
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

  let debouncedSearch = debouncer(onSearchInputHandler, 200);

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

<div class="flex flex-col bg-bgs1 max-h-96 w-80">
  <div class="p-2 border-b border-brs1">
    <div class="relative">
      <Icon
        icon="search"
        size="sm"
        classList="absolute left-2 top-1/2 -translate-y-1/2 text-fgs3"
      />
      <input
        bind:this={searchRef}
        type="text"
        placeholder="Search emojis..."
        class="w-full pl-8 pr-3 py-2 text-b2 bg-bgs2 border border-brs1 rounded-md focus:outline-none focus:border-aps1"
        on:input={debouncedSearch}
        bind:value={searchQuery}
      />
    </div>
  </div>

  <div
    bind:this={emojisParentContainer}
    class="flex-1 overflow-y-auto p-2"
    on:scroll={handleScroll}
  >
    {#if Object.keys(displayEmojis).length === 0}
      <div class="text-center text-fgs3 py-8 text-b2">No emojis found</div>
    {:else}
      {@const emojiKeys = Object.keys(displayEmojis)}
      {#each emojiKeys as category, categoryIndex}
        {#if displayEmojis[category] && displayEmojis[category].length > 0}
          <div
            class="emoji-category mb-4"
            id={"EMOJI" + categoryIndex}
          >
            <div class="text-b3 font-medium text-fgs2 mb-2 px-1">
              {category}
            </div>
            <div class="grid grid-cols-8 gap-1">
              {#each displayEmojis[category] as emoji, emojiIndex}
                {@const globalIndex = flatEmojiList.indexOf(emoji)}
                <button
                  class={cn(
                    "emoji-item p-2 text-2xl rounded hover:bg-bgs2 transition-colors cursor-pointer flex items-center justify-center",
                    {
                      "bg-bgs2 ring-2 ring-aps1": globalIndex === selectedIndex
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
