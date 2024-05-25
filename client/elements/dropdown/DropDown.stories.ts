import type { Meta, StoryObj } from "@storybook/svelte";

import DropDown from "./DropDown.svelte";
import {
  DropDownStyle,
  type DropdownItem
} from "$lib/client/types/dropdownItem.type";
const meta = {
  component: DropDown,
  argTypes: {
    parentBackgroundIndex: {
      control: { type: "number", min: 0, max: 3, step: 1 }
    },
    isActive: { control: "boolean" }
  },
  args: {
    items: [
      { label: "Item 1", value: "item1", icon: "cross", disabled: false },
      { label: "Item 2", value: "item2", icon: "plus", disabled: false },
      { label: "Item 3", value: "item3", icon: "minus", disabled: false }
    ],
    value: "item2",
    parentBackgroundIndex: 2,
    isActive: false
  }
} satisfies Meta<DropDown>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    style: DropDownStyle.DEFAULT
  }
};
export const Outlined: Story = {
  args: {
    style: DropDownStyle.OUTLINED
  }
};
export const PanelSwitch: Story = {
  args: {
    style: DropDownStyle.PANEL_SWITCH
  }
};
export const isActive: Story = {
  args: {
    style: DropDownStyle.DEFAULT,
    isActive: true
  }
};
export const isActiveOutlined: Story = {
  args: {
    style: DropDownStyle.OUTLINED,
    isActive: true
  }
};
export const isActivePanelSwitch: Story = {
  args: {
    style: DropDownStyle.PANEL_SWITCH,
    isActive: true
  }
};
