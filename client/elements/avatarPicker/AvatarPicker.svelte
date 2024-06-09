<script lang="ts">
  import PanelSwitcher from "../switcher/PanelSwitcher.svelte";
  import { ColorStrength } from "../../types/appearance.type";
  import { deepCopy } from "$lib/client/utils/obj.utils";
  import Divider from "../Divider.svelte";
  import Button from "../button/Button.svelte";
  import Icon from "../Icon.svelte";
  import {
    appStoreShuffleEmojis,
    userPreferences
  } from "../../stores/app.store";
  import { Size } from "../../types/size.enum";
  import { createEventDispatcher, onMount } from "svelte";
  import { debouncer } from "$lib/client/utils/utils";
  import {
    AvatarType,
    type Avatar,
    type CustomUploadedAvatar,
    type AvatarWithCode,
    type IconAvatar,
    type EmojiAvatar,
    AvatarPickerContext
  } from "../../types/avatar.type";
  import { Persistence } from "../../persistence/persistence";
  import { IconVariant } from "../../types/icon.type";
  import { PanelSwitcherStyle } from "../../types/switcher.enum";
  import Text from "../text/Text.svelte";
  import { TextStyle } from "../../types/text.enum";
  import ActiveBackgroundElement from "../style/ActiveBackgroundElement.svelte";
  import BackgroundElement from "../style/BackgroundElement.svelte";
  import AvatarView from "./AvatarView.svelte";
  import { emojis, materialSymbols } from "$lib/client/data/avatars";
  import SwitchInput from "../toggle/SwitchInput.svelte";
  import account from "$lib/client/stores/account.store";
  import UploadButton from "$lib/client/elements/button/UploadButton.svelte";
  export let mode: AvatarType.EMOJI | AvatarType.ICON = AvatarType.ICON;
  export let context: AvatarPickerContext = AvatarPickerContext.DEFAULT;
  let activeCategory: string = "";
  type StoreAvatars = {
    "Frequently Used": Avatar[][];
    Custom: Avatar[][];
  } & {
    [category: string]: { name: string; code: string }[][];
  };

  let materialSymbolsWithCategories: StoreAvatars = {
    "Frequently Used": [],
    Custom: [],
    Actions: materialSymbols
  };
  let emojisWithCategories: StoreAvatars = {
    "Frequently Used": [],
    Custom: [],
    ...emojis
  };
  /**
   * A copy of the store avatars based on the mode. Whose items wont be modified except for the frequently used and custom as we add them later.
   * @summary To store the avatars based on the mode.
   */
  let storeAvatars =
    mode == AvatarType.ICON
      ? materialSymbolsWithCategories
      : emojisWithCategories;

  $: if (mode === AvatarType.ICON) {
    storeAvatars = materialSymbolsWithCategories;
    avatars = storeAvatars;
  } else {
    storeAvatars = emojisWithCategories;
    avatars = storeAvatars;
  }
  /**
   * A copy of the store avatars based on the mode. Whose items will be modified based on the search input.
   * @summary Mutable Store Avatar for Search purpose.
   */
  let avatars = storeAvatars;
  let avatarsParentContainer: HTMLDivElement;
  $: if (mode && avatarsParentContainer)
    avatarsParentContainer?.scrollTo({ top: 0, left: 0, behavior: "smooth" });
  let avatarKeys: string[] = Object.keys(avatars);
  $: avatarKeys = Object.keys(avatars);
  $: console.log({ avatarKeys, avatars });
  let checked: boolean = $userPreferences.avatarPicker.filled;
  $: $userPreferences.avatarPicker.filled = checked;
  let skinTones = [
    "#FFCC22",
    "#FADCBC",
    "#DEBB90",
    "#BB9167",
    "#8E562E",
    "#553319"
  ];
  let skinIndex: number = $userPreferences.avatarPicker.skinIndex; //change to user preference store this also in db
  $: $userPreferences.avatarPicker.skinIndex = skinIndex;
  let colorPalate = ["#000000", "#C2AB4E", "#C14D8A"];
  let iconColor = $userPreferences.avatarPicker.iconColor;
  $: $userPreferences.avatarPicker.iconColor = iconColor;
  let searchRef: HTMLInputElement;
  let eventDispatcher = createEventDispatcher();
  let shuffleEmojis = $appStoreShuffleEmojis;

  onMount(() => {
    let userPrefSub: any;
    if (context === AvatarPickerContext.DEFAULT) {
      userPrefSub = userPreferences.subscribe((prefs) => {
        storeAvatars["Frequently Used"] = (
          mode == AvatarType.ICON
            ? prefs.avatarPicker.usedIcons
            : prefs.avatarPicker.usedEmojis
        )
          ?.slice(0, 50)
          .filter((emote) => emote[0]?.frequency > 2);
        storeAvatars["Custom"] = (
          mode == AvatarType.ICON
            ? prefs.avatarPicker.usedIcons
            : prefs.avatarPicker.usedEmojis
        )?.filter((emote) => "URL" in emote[0] && emote[0].URL);
        avatars = storeAvatars;
      });
    }
    return () => {
      if (userPrefSub) userPrefSub();
    };
  });

  /**
   * Invoked when the shuffle button is clicked.Depending on the mode It picks a random emoji from $appStoreShuffleEmojis or random icon from the used list and emits the avatar clicked. Finally closes the avatar picker.
   * @summary To pick a random emoji or icon.
   */
  function ShufflePick() {
    eventDispatcher(
      "avatarClicked",
      mode == AvatarType.ICON
        ? $userPreferences.avatarPicker.usedIcons[
            Math.floor(
              Math.random() * $userPreferences.avatarPicker.usedIcons.length
            )
          ][0]
        : shuffleEmojis[Math.floor(Math.random() * shuffleEmojis.length)][0]
    );
    eventDispatcher("close");
  }

  /**
   * When scroll happens within the avatarsParentContainer this function is invoked. It checks the scroll position and highlights the corresponding panel item.
   * @summary To higlight the panel item
   * @desc avt - Avatar Category Indicators Class
   * @desc AVT - Avatar Category Containers Class
   */
  function handleScroll() {
    let scrollTop = avatarsParentContainer.scrollTop;
    let avtContainers = document.querySelectorAll(".AVT");
    avtContainers.forEach((avtContainer: any) => {
      let avtContainerHeight = avtContainer.offsetHeight;
      let avtContainerTop = avtContainer.offsetTop - 10;
      let avtContainerIndicator = document.getElementById(
        avtContainer.id.toLowerCase()
      );
      if (
        scrollTop > avtContainerTop &&
        scrollTop < avtContainerTop + avtContainerHeight
      ) {
        // avtContainerIndicator?.classList.add("bg-aps1", "text-bgs1");
        activeCategory = avtContainer.id;
      } else avtContainerIndicator?.classList.remove("bg-aps1", "text-bgs1");
    });
  }
  /**
   * When a panel item is clicked this function is invoked. It scrolls the avatarsParentContainer to the corresponding panel item category.
   * @summary To scroll to the corresponding panel item category
   * @param event
   */
  function PanelItemClickHandler(event: any) {
    let currentElement = document.getElementById(event.target.id.toUpperCase());
    avatarsParentContainer.scrollTo({
      top: currentElement?.offsetTop,
      left: 0,
      behavior: "smooth"
    });
  }
  /**
   * When the search input is changed this function is invoked. It filters the avatars based on the search input and displays the same.It Considers even removinng the entire string typed or resseting as trigger.
   * @summary To filter the avatars based on the search input
   */
  function onSearchInputHandler() {
    let searchValue = searchRef.value.trim();
    if (searchValue == "") {
      avatars = storeAvatars;
      return;
    }
    let tempAvatars: any = {};
    for (let key of avatarKeys) {
      for (let emote of storeAvatars[key as keyof typeof storeAvatars]) {
        let searchIndex = emote.length == 1 ? 0 : skinIndex;
        let emoteName = emote[searchIndex]?.name?.toLowerCase();
        if (emoteName.includes(searchValue.toLocaleLowerCase())) {
          if (tempAvatars[key] == undefined) tempAvatars[key] = [];
          tempAvatars[key].push(emote);
        }
      }
    }
    avatars = tempAvatars;
  }
  /**
   *Debounced version of the onSearchInputHandler function to reduce the unnecessary calls when the user as not completed typing.
   */
  let debouncedSearch = debouncer(onSearchInputHandler, 500);

  /**
   * Invoked by itemClickHandler. It checks if the item is present already in the used list,if presents just increases the frequency else adds it with frequency initialised as 1. Finally sorts the used list based on the frequency and emits the avatar Clicked.
   * @summary To add the clicked emoji or icon to the used list.
   * @param emote - The clicked emoji or icon.
   */
  function addToUsedList(emote: any) {
    let tempEmote = deepCopy(emote) as Avatar;
    if (mode == AvatarType.ICON) {
      let index = $userPreferences.avatarPicker.usedIcons?.findIndex((el) => {
        return (
          el[0].name == emote.name &&
          (("URL" in el[0] && el[0].URL !== undefined) ||
            ("color" in el[0] &&
              el[0].color == iconColor &&
              "isFilled" in el[0] &&
              el[0].isFilled == checked))
        );
      });
      if (index == -1) {
        tempEmote = tempEmote as AvatarWithCode<IconAvatar>;
        tempEmote.type = AvatarType.ICON;
        tempEmote.frequency = 1;
        tempEmote.color = iconColor;
        tempEmote.isFilled = checked;
        $userPreferences.avatarPicker.usedIcons = [
          ...$userPreferences?.avatarPicker?.usedIcons,
          [tempEmote]
        ];
      } else {
        $userPreferences.avatarPicker.usedIcons[index][0].frequency++;
        tempEmote = $userPreferences.avatarPicker.usedIcons[index][0];
      }
      $userPreferences.avatarPicker.usedIcons.sort(
        (a, b) => b[0].frequency - a[0].frequency
      );
    } else {
      let index = $userPreferences.avatarPicker.usedEmojis?.findIndex((el) => {
        return (
          el[0].name == emote.name &&
          (("URL" in el[0] && el[0].URL !== undefined) ||
            ("code" in el[0] && el[0].code == emote.code))
        );
      });
      if (index == -1) {
        tempEmote = tempEmote as AvatarWithCode<EmojiAvatar>;
        tempEmote.type = AvatarType.EMOJI;
        tempEmote.frequency = 1;
        $userPreferences.avatarPicker.usedEmojis = [
          ...$userPreferences.avatarPicker.usedEmojis,
          [tempEmote]
        ];
      } else {
        $userPreferences.avatarPicker.usedEmojis[index][0].frequency++;
        tempEmote = $userPreferences.avatarPicker.usedEmojis[index][0];
      }

      $userPreferences.avatarPicker.usedEmojis.sort(
        (a, b) => b[0].frequency - a[0].frequency
      );
    }
    eventDispatcher("avatarClicked", tempEmote);
  }
  /**
   * When an emoji or icon is clicked this function is invoked. if the avatar is an emoji, checks, it's a normal emoji or emoji with skins and invokes the addToFrequntlyUsed method with corresponding skin.If avatar is an icon,the color and fill is handled in addToUsedList method thus this function just invokes with the icon clicked.Finally Closes the avatar picker.
   * @summary To handle the click event of the emoji or icon.
   * @param emote - The clicked emoji or icon.
   * */
  function itemClickHandler(emote: any) {
    if (searchRef.value) {
      searchRef.value = "";
      avatars = storeAvatars;
    }
    if (emote.length == 1) addToUsedList(emote[0]);
    else addToUsedList(emote[skinIndex]);
    eventDispatcher("close");
  }
  /**
   * Invoked when the custom upload button is clicked. It triggers the file input element to open the file picker.
   * @summary To programatically trigger click on the the file input element.
   */
  function triggerFileInput() {
    const inputElement = document.getElementById("myFile");
    inputElement?.click();
  }

  async function uploadedImageToEmote(input: any) {
    let imageLocalURL = new Blob([input], { type: input.type });
    let customName = input.name.split(".")[0].trim();
    let s3Response = await account.uploadFile(
      input.type,
      customName,
      imageLocalURL
    );
    let s3URL = s3Response?.uploadURL.split("?")[0];
    return {
      name: customName,
      URL: s3URL,
      frequency: 0,
      type: AvatarType.CUSTOM_UPLOAD
    } as CustomUploadedAvatar;
  }
  /**
   * Invoked when the click event happens on file input element. It first checks the filename already exists if not then uploads the custom avatar to the s3 and adds the avatar returned URL to the used list.
   * @summary To add custom avatar to the used list.
   */
  async function customUploadHandler(event: any) {
    let input = event.target.files[0];
    let customName = input.name.split(".")[0].trim();
    if (mode == AvatarType.ICON) {
      for (let icon of $userPreferences.avatarPicker.usedIcons) {
        if (icon[0].name.toLowerCase() == customName.toLowerCase()) {
          alert("The icon name already exists. Please rename and upload");
          return;
        }
      }
      let emote = await uploadedImageToEmote(input);
      $userPreferences.avatarPicker.usedIcons = [
        ...$userPreferences.avatarPicker.usedIcons,
        [emote]
      ];
    } else {
      for (let emoji of $userPreferences.avatarPicker.usedEmojis) {
        if (emoji[0].name.toLowerCase() == customName.toLowerCase()) {
          alert("The emoji name already exists. Please rename and upload");
          return;
        }
      }
      let emote = await uploadedImageToEmote(input);
      $userPreferences.avatarPicker.usedEmojis = [
        ...$userPreferences.avatarPicker.usedEmojis,
        [emote]
      ];
    }
  }
</script>

<div
  class="h-[28rem] {context === AvatarPickerContext.DEFAULT
    ? 'w-[35rem]'
    : 'w-[24rem]'}"
>
  <div class="flex h-12 border-b border-b-brs2 p-2">
    {#if context === AvatarPickerContext.DEFAULT}
      <div class="flex w-3/10 h-full px-2">
        <PanelSwitcher
          items={["Icon", "Emoji"]}
          size={Size.xs}
          style={PanelSwitcherStyle.TRAIN}
          value={mode == AvatarType.ICON ? "Icon" : "Emoji"}
          on:switch={(event) => (mode = event.detail.toUpperCase())}
        />
      </div>
    {/if}
    <div class="flex h-full justify-around grow">
      <div class="flex rounded-md w-8/10 px-1 border border-brs2">
        <Icon icon="search-mini" variant={IconVariant.Outline} size={Size.sm} />
        <input
          type="search"
          placeholder="Search"
          bind:this={searchRef}
          on:input={debouncedSearch}
          id="iconPickerSearch"
          class="w-full h-full p-0.5 pl-2 bg-transparent text-fgs1 text-b2 truncate outline-none rounded-md"
        />
      </div>
      <Button icon="clock" on:click={ShufflePick} />
      <Button
        icon="trash"
        on:click={() => {
          eventDispatcher("delete");
          eventDispatcher("close");
        }}
      />
    </div>
  </div>
  <div class="flex h-9/10">
    {#if context === AvatarPickerContext.DEFAULT}
      <div
        class="relative w-3/10 min-w-[30%] h-full flex flex-col gap-2 px-2 py-2 border-r border-r-brs2"
      >
        <div class="px-2">
          <Text content="Category" style={TextStyle.SECTION_HEADING_SMALL} />
        </div>
        <div class="flex flex-col gap-1">
          {#each avatarKeys as key, index (index)}
            {#if avatars[key] !== undefined && avatars[key].length > 0}
              <ActiveBackgroundElement
                isBackgroundActive={activeCategory == "AVT" + index}
                id={"avt" + index}
                class={"block w-full px-2 py-0.5 text-b2 text-left hover:bg-bgs2 rounded-md"}
                on:click={PanelItemClickHandler}
              >
                {key}
              </ActiveBackgroundElement>
            {/if}
          {/each}
        </div>
        {#if mode == AvatarType.ICON}
          <Divider colorStrength={ColorStrength.Strong} thickness={2} />
          <SwitchInput label="Fill" bind:checked size={Size.sm} />
        {/if}
        <div class="absolute bottom-3 -right-2 pb-1 w-9/10">
          <UploadButton size={Size.sm} on:input={customUploadHandler} />
        </div>
      </div>
    {/if}
    <div class="flex flex-col grow h-full">
      <BackgroundElement
        class="w-full h-1/10 flex items-center gap-3 px-4 border-b border-b-brs2"
        parentBgIndex={1}
      >
        {#if mode == AvatarType.ICON}
          {#each colorPalate as color}
            <span
              id={"colPalate" + color}
              class="inline-flex justify-center items-center rounded-full w-7 h-7"
              style="padding: 0rem;{iconColor == color
                ? `border:1px solid ${color}`
                : ''}"
            >
              <button
                id={"colPalateButton" + color}
                on:click={() => (iconColor = color)}
                class="rounded-full w-5 h-5"
                style="background-color:{color}"
              ></button></span
            >
          {/each}
        {:else}
          {#each skinTones as skin, index}
            <span
              class="inline-flex justify-center items-center rounded-full w-7 h-7"
              style="padding: 0rem;{skinIndex == index
                ? `border:1px solid ${skin}`
                : ''}"
            >
              <button
                on:click={() => (skinIndex = index)}
                class="rounded-full w-5 h-5"
                style="background-color:{skin}"
              ></button></span
            >
          {/each}
        {/if}
      </BackgroundElement>
      <div
        bind:this={avatarsParentContainer}
        on:scroll={handleScroll}
        class="relative w-full h-8/10 overflow-auto mt-3"
      >
        {#each avatarKeys as key, index}
          {#if avatars[key] !== undefined && avatars[key].length > 0}
            <div id={"AVT" + index} class="AVT flex flex-col p-2">
              <p class="text-b4 text-fgs3 px-2">{key}</p>
              <div class="flex flex-wrap">
                {#each avatars[key] as emote, index (index)}
                  <button
                    on:click={() => itemClickHandler(emote)}
                    on:mouseenter={() => {
                      searchRef.placeholder = emote[0].name;
                    }}
                    on:mouseleave={() => {
                      searchRef.placeholder = "Search";
                    }}
                    class="flex justify-center items-center h-8 w-8 p-1 hover:bg-bgs2"
                  >
                    <AvatarView
                      avatar={{
                        code:
                          "code" in emote[0]
                            ? emote.length == 1
                              ? emote[0].code
                              : emote[skinIndex].code
                            : "",
                        color:
                          "color" in emote[0] &&
                          typeof emote[0].color === "string"
                            ? emote[0]?.color
                            : iconColor,
                        isFilled:
                          "isFilled" in emote[0] &&
                          typeof emote[0].isFilled == "boolean"
                            ? emote[0]?.isFilled
                            : checked,
                        type: mode,
                        name: emote[0].name,
                        frequency:
                          "frequency" in emote[0] &&
                          typeof emote[0].frequency === "number"
                            ? emote[0].frequency
                            : 0,
                        URL:
                          "URL" in emote[0] && typeof emote[0].URL === "string"
                            ? emote[0].URL
                            : ""
                      }}
                      size={Size.lg}
                    />
                  </button>
                {/each}
              </div>
            </div>
          {/if}
        {/each}
      </div>
    </div>
  </div>
</div>
