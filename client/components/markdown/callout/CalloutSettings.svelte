<script lang="ts">
  import Avatar from "$lib/client/elements/avatarPicker/Avatar.svelte";
  import ColorPickerMini from "$lib/client/elements/colorPicker/ColorPickerMini.svelte";
  import CustomColorPropagator from "$lib/client/elements/style/CustomColorPropagator.svelte";
  import Table2 from "$lib/client/elements/table/Table2.svelte";
  import InlineErrorMessage from "$lib/client/elements/text/InlineErrorMessage.svelte";
  import Text from "$lib/client/elements/text/Text.svelte";
  import { MemotronAction } from "$lib/client/products/memotron/memotronAction.enum";
  import {
    AvatarPickerContext,
    AvatarType,
    type IAvatar
  } from "$lib/client/types/avatar.type";
  import {
    TableCellDefaultAction,
    TableCellType,
    type TableColumn
  } from "$lib/client/types/table.type";
  import { TextStyle } from "$lib/client/types/text.enum";
  import { generateSimpleRandomId } from "$lib/shared/utils/crypto.utils";
  import ModalFooter from "../../modal/ModalFooter.svelte";
  import { markdownSettings } from "../markdown.settings";

  let previewId: string | undefined = $markdownSettings.callout[0]?.id;
  let error: string | undefined = undefined;
  const columns: TableColumn[] = [
    {
      key: "play",
      type: TableCellType.ACTION,
      actionTooltip: {
        body: "Preview"
      },
      action: (row: any) => {
        previewId = row.id;
      }
    },
    {
      label: "Icon",
      key: "avatar",
      width: 0.5,
      type: TableCellType.CUSTOM,
      component: Avatar,
      componentProps: (row: any) => ({
        avatar: row.avatar,
        isInEditMode: true,
        context: AvatarPickerContext.CALLOUT_AVATAR,
        changeCallback: (avatar: IAvatar) => {
          row.avatar = {
            ...avatar,
            color: undefined
          };
          previewId = undefined;
          previewId = row.id;
        }
      })
    },
    {
      label: "Label",
      key: "label",
      width: 2,
      type: TableCellType.TEXT_INPUT,
      placeholder: "Enter label"
    },
    {
      label: "Color",
      key: "color",
      width: 1,
      type: TableCellType.CUSTOM,
      component: ColorPickerMini,
      componentProps: (row: any) => ({
        hue: row.color,
        changeCallback: (value: number | string) => {
          row.color = +value;
          previewId = undefined;
          previewId = row.id;
        }
      })
    }
  ];

  function addCallout() {
    console.log("addCallout");
    $markdownSettings.callout = [
      ...$markdownSettings.callout,
      {
        id: generateSimpleRandomId(),
        avatar: {
          type: AvatarType.ICON,
          isFilled: true,
          code: "&#XE88E"
        },
        color: Math.random() * 360,
        label: ""
      }
    ];
  }
  async function onSave() {
    console.log("onSave", $markdownSettings.callout);
    error = undefined;
    if ($markdownSettings.callout.some((x) => !x.label)) {
      error = "Please enter a label for each callout";
      return;
    }
    return markdownSettings.save();
  }
</script>

<div class="flex flex-col gap-4 w-full h-full">
  <div class="w-full flex flex-1 overflow-y-auto">
    <Table2
      {columns}
      bind:data={$markdownSettings.callout}
      actions={[{ action: TableCellDefaultAction.REMOVE, index: 0 }]}
      addAction="Add"
      on:add={addCallout}
    />
  </div>
  <!-- Callout Preview -->
  {#if previewId}
    {@const preview = $markdownSettings.callout.find(
      (item) => item.id === previewId
    )}
    <CustomColorPropagator
      color={preview?.color}
      class="flex flex-col gap-3 w-full text-left border border-brs2 rounded-md p-4"
    >
      <Text
        content={`Preview for "${preview?.label ?? "Untitled Callout"}"`}
        style={TextStyle.SECTION_HEADING_SMALL}
      />
      <div
        class="flex items-center gap-2 border border-ccs2 bg-ccs4 p-2 rounded-md"
      >
        <div class="flex items-center gap-2 text-ccs1 h-full">
          <div class="flex flex-col justify-start h-full pt-2">
            <Avatar avatar={preview?.avatar} />
          </div>
          <div>
            Lorem ipsum dolor sit amet consectetur adipisicing elit. Assumenda
            necessitatibus veniam provident beatae a hic voluptates repellendus
            odit eius eligendi excepturi possimus iusto, vero nulla nemo, amet
            labore! Repudiandae, quae.
          </div>
        </div>
      </div>
    </CustomColorPropagator>
  {/if}
  <InlineErrorMessage bind:error />
  <ModalFooter
    action={MemotronAction.CALLOUT_SETTINGS}
    primaryAction={{
      label: "Save",
      callback: onSave
    }}
    secondaryAction={{
      label: "Cancel"
    }}
  />
</div>
