<script lang="ts">
  import Button from "@21n/elements/button/Button.svelte";
  import Divider from "@21n/elements/Divider.svelte";
  import KeyboardToolbar from "@21n/elements/keyboardToolbar/KeyboardToolbar.svelte";
  import PanelSwitcher from "@21n/elements/switcher/PanelSwitcher.svelte";
  import Toggle from "@21n/elements/toggle/Toggle.svelte";
  import {
    embedNodeTypeList,
    mediaNodeTypeList,
    NodeType,
    structuralNodeTypes,
    webNodeTypeList
  } from "@21n/products/memotron/node/node.type";
  import context from "@21n/stores/context.store";
  import { ColorStrength } from "@21n/types/appearance.type";
  import { ButtonStyle, ButtonVariant } from "@21n/types/button.type";
  import { Orientation } from "@21n/types/direction.enum";
  import { Size } from "@21n/types/size.enum";
  import {
    BarStyle,
    PanelSwitcherStyle
  } from "@21n/types/switcher.enum";
  import { cn } from "@21n/utils/ui.utils";
  import { properCase } from "@21n/shared-utils/text.utils";
  import { fly } from "svelte/transition";
  import { resolveBlockBrowserConfigOnKeyboard } from "@21n/components/markdown/blockBrowser/blockBrowser.utils";
  import BlockBrowserOnKeyboard from "@21n/components/markdown/blockBrowser/BlockBrowserOnKeyboard.svelte";
  import { BlockAction } from "@21n/components/markdown/md.type";
  import MdKeyboardKeysRow from "@21n/components/markdown/toolbar/MdKeyboardKeysRow.svelte";
  import { createEventDispatcher, getContext } from "svelte";
  import type { IRecordId } from "@21n/types/data.type";
  const dispatch = createEventDispatcher();
  const nodeContext = getContext<any>("node");

  export let keyboardToolbarPanelSelection: string | undefined = undefined;
  export let selectedBlocks: IRecordId[] = [];
  let isPreventDefaultOnKeyboardClose: boolean = false;
  let keyboardToolbarRef: KeyboardToolbar;
  const keyboardToolbarActions: {
    value: BlockAction;
    icon: string;
    label: string;
  }[] = [
    {
      value: BlockAction.MOVEUP,
      icon: "arrow-up",
      label: "Move up"
    },
    {
      value: BlockAction.MOVEDOWN,
      icon: "arrow-down",
      label: "Move down"
    },
    {
      value: BlockAction.DUPLICATE,
      icon: "copy",
      label: "Duplicate"
    },
    // {
    //   value: BlockAction.CONVERT,
    //   icon: "proceed",
    //   label: "Convert"
    // },
    {
      value: BlockAction.COPY_BLOCK_TEXT,
      icon: "clipboard",
      label: "Copy block text"
    },
    {
      value: BlockAction.DELETE,
      icon: "trash",
      label: "Delete"
    }
  ];

  const bulkKeyboardToolbarActions: {
    value: BlockAction;
    icon: string;
    label: string;
  }[] = [
    // {
    //   value: BlockAction.DUPLICATE,
    //   icon: "copy",
    //   label: "Duplicate"
    // },
    // {
    //   value: BlockAction.COPY_BLOCK_TEXT,
    //   icon: "clipboard",
    //   label: "Copy block text"
    // },
    {
      value: BlockAction.DELETE,
      icon: "trash",
      label: "Delete"
    }
  ];

  const configData = resolveBlockBrowserConfigOnKeyboard({
    contentType: nodeContext?.contentType,
    context: $context
  });

  $: categories = [
    ...(configData.config.map((section) => ({
      label: properCase(section.section),
      value: section.section
    })) ?? [])
  ];
  let selectedSection = configData.config[0].section;

  export function action(action: "actions" | "insert") {
    isPreventDefaultOnKeyboardClose = true;
    if (keyboardToolbarPanelSelection !== action)
      keyboardToolbarPanelSelection = action;
    document.activeElement?.blur();
  }

  function insertTextAtCursor(text: string) {
    const activeElement = document.activeElement;
    if (!activeElement) return;

    let keyupEvents: KeyboardEvent[] = [];
    if (text === "@") {
      const shiftKeyupEvent = new KeyboardEvent("keyup", {
        key: "Shift",
        code: "ShiftLeft",
        shiftKey: false,
        bubbles: true,
        cancelable: true
      });

      const digit2KeyupEvent = new KeyboardEvent("keyup", {
        key: "2",
        code: "Digit2",
        shiftKey: false,
        bubbles: true,
        cancelable: true
      });
      keyupEvents = [shiftKeyupEvent, digit2KeyupEvent];
    } else {
      const keyupEvent = new KeyboardEvent("keyup", {
        key: text,
        bubbles: true,
        cancelable: true
      });
      keyupEvents = [keyupEvent];
    }

    // Create keyboard events
    const keydownEvent = new KeyboardEvent("keydown", {
      key: text,
      bubbles: true,
      cancelable: true
    });
    const keypressEvent = new KeyboardEvent("keypress", {
      key: text,
      bubbles: true,
      cancelable: true
    });

    // Create an input event
    const inputEvent = new InputEvent("input", {
      inputType: "insertText",
      data: text,
      bubbles: true,
      cancelable: true
    });

    // For contenteditable elements
    if (activeElement.hasAttribute("contenteditable")) {
      const selection = window.getSelection();
      const range = selection?.getRangeAt(0);
      if (range) {
        // Dispatch events in order
        activeElement.dispatchEvent(keydownEvent);
        activeElement.dispatchEvent(keypressEvent);

        range.deleteContents();
        range.insertNode(document.createTextNode(text));
        range.collapse(false);

        activeElement.dispatchEvent(inputEvent);
        if (text === "@") {
          setTimeout(() => {
            keyupEvents.forEach((event) => {
              activeElement.dispatchEvent(event);
            });
          }, 10);
        } else {
          keyupEvents.forEach((event) => {
            activeElement.dispatchEvent(event);
          });
        }
      }
      return;
    }

    // For input/textarea elements
    if (
      activeElement instanceof HTMLInputElement ||
      activeElement instanceof HTMLTextAreaElement
    ) {
      const start = activeElement.selectionStart ?? 0;
      const end = activeElement.selectionEnd ?? 0;
      const value = activeElement.value;

      // Dispatch events in order
      activeElement.dispatchEvent(keydownEvent);
      activeElement.dispatchEvent(keypressEvent);

      // Update the value
      activeElement.value =
        value.substring(0, start) + text + value.substring(end);

      // Update cursor position
      activeElement.setSelectionRange(start + text.length, start + text.length);

      // Dispatch remaining events
      activeElement.dispatchEvent(inputEvent);
      keyupEvents.forEach((event) => {
        activeElement.dispatchEvent(event);
      });
    }
  }

  function onKeyboardToolbarAction(action: string) {
    if (
      !keyboardToolbarPanelSelection ||
      keyboardToolbarPanelSelection !== action
    ) {
      if (!keyboardToolbarPanelSelection) dispatch("select");
      isPreventDefaultOnKeyboardClose = true;
      keyboardToolbarPanelSelection = action;
      document.activeElement?.blur();
    } else {
      keyboardToolbarPanelSelection = undefined;
      dispatch("focus");
      dispatch("unselect");
    }
  }

  function onKeyboardToolbarKeyPress(e: CustomEvent<string>) {
    const key = e.detail;
    if (["@", "#", "*", '"', "[]", "-"].includes(key)) {
      insertTextAtCursor(key);
    } else if (key === "--") {
      onAction(BlockAction.INSERT, {
        blockType: NodeType.DIVIDER
      });
    }
  }

  function onAction(action: BlockAction, data: any) {
    dispatch("action", {
      action,
      data
    });
  }

  function onClose() {
    keyboardToolbarRef?.close();
    isPreventDefaultOnKeyboardClose = false;
    keyboardToolbarPanelSelection = undefined;
  }
</script>

<KeyboardToolbar
  bind:this={keyboardToolbarRef}
  isMdToolbar={true}
  offset={56}
  {isPreventDefaultOnKeyboardClose}
  class="bg-bgs2 flex flex-col"
>
  <div class="flex items-center justify-between gap-1 w-full h-[56px]">
    <div
      class={cn("flex items-center gap-1 h-full pl-2", {
        "w-full": keyboardToolbarPanelSelection !== undefined,
        "justify-between":
          keyboardToolbarPanelSelection === "actions" &&
          selectedBlocks.length > 1
      })}
    >
      {#if selectedBlocks.length <= 1}
        <Toggle
          icon="plus-circle"
          parentBgIndex={2}
          on={keyboardToolbarPanelSelection === "insert"}
          on:mousedown={(e) => e.preventDefault()}
          on:change={() => {
            onKeyboardToolbarAction("insert");
          }}
        />
      {/if}
      {#if keyboardToolbarPanelSelection === "insert"}
        <!-- <Divider
          orientation={Orientation.Vertical}
          colorStrength={ColorStrength.Strong}
        /> -->
        <div
          class="h-fit flex flex-col justify-end gap-1 w-full overflow-x-auto"
          in:fly={{ x: -10 }}
        >
          <PanelSwitcher
            items={categories}
            value={selectedSection}
            parentBgIndex={2}
            style={PanelSwitcherStyle.BAR}
            barStyle={BarStyle.UNDER}
            on:switch={(e) => {
              selectedSection = e.detail;
            }}
          />
        </div>
      {:else}
        <Toggle
          icon="command"
          parentBgIndex={2}
          on={keyboardToolbarPanelSelection === "actions"}
          on:mousedown={(e) => e.preventDefault()}
          on:change={(e) => {
            onKeyboardToolbarAction("actions");
          }}
        />
        {#if selectedBlocks.length > 1}
          <span class="text-b2 text-fgs2 px-2">
            {selectedBlocks.length} blocks selected
          </span>
        {/if}
      {/if}
    </div>

    {#if !keyboardToolbarPanelSelection}
      <MdKeyboardKeysRow
        on:key={onKeyboardToolbarKeyPress}
        on:close={onClose}
      />
    {/if}
  </div>
  <div class="min-h-0 flex-1 p-2">
    {#if keyboardToolbarPanelSelection === "actions"}
      {@const actions =
        selectedBlocks.length > 1
          ? bulkKeyboardToolbarActions
          : keyboardToolbarActions}
      <div class="grid grid-cols-2 gap-2" transition:fly={{ y: 10 }}>
        {#each actions as action}
          <Button
            icon={action.icon}
            label={action.label}
            parentBgIndex={2}
            type={action.value === BlockAction.DELETE
              ? ButtonVariant.DANGER
              : undefined}
            style={action.value === BlockAction.DELETE
              ? ButtonStyle.OUTLINED
              : undefined}
            size={Size.sm}
            on:click={() => {
              onAction(action.value, undefined);
              keyboardToolbarPanelSelection = undefined;
            }}
            on:mousedown={(e) => e.preventDefault()}
          />
        {/each}
      </div>
      <span class="text-b3 text-fgs3 flex justify-center mt-4">
        Tip: swipe from left to right to select a block
      </span>
    {:else if keyboardToolbarPanelSelection === "insert"}
      <BlockBrowserOnKeyboard
        {configData}
        {selectedSection}
        on:select={(e) => {
          const toType = e.detail;
          if (
            [
              ...mediaNodeTypeList,
              ...webNodeTypeList,
              ...embedNodeTypeList,
              ...structuralNodeTypes,
              NodeType.EMBED
            ].includes(toType)
          ) {
            isPreventDefaultOnKeyboardClose = false;
            keyboardToolbarRef?.close();
          }
          dispatch("insert", toType);
          keyboardToolbarPanelSelection = undefined;
        }}
      />
    {/if}
  </div>
</KeyboardToolbar>
