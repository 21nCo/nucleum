import type { Meta, StoryObj } from "@storybook/svelte";

import PanelSwitcher from "./PanelSwitcher.svelte";

import { Size } from "$lib/client/types/size.enum";
import { PanelSwitcherStyle } from "$lib/client/types/switcher.enum";
const meta = {
  component: PanelSwitcher,
  argTypes: {
    activeColor: { control: { type: "range", min: -1, max: 255, step: 1 } },
    isDisableEnabled: { control: "boolean" },
    parentBackgroundIndex: {
      control: { type: "number", min: 0, max: 3, step: 1 }
    }
  },
  args: {
    items: ["Item 1", "Item 2", "Item 3", "Item 4", "Item 5"],
    selected: "Item 2",
    activeColor: undefined,
    isDisableEnabled: false,
    parentBackgroundIndex: 2,
    size: Size.md
  }
} satisfies Meta<PanelSwitcher>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    style: PanelSwitcherStyle.DEFAULT
  }
};
export const Bar: Story = {
  args: {
    style: PanelSwitcherStyle.BAR
  }
};

export const Dot: Story = {
  args: {
    style: PanelSwitcherStyle.DOT
  }
};

export const BarWithBg: Story = {
  args: {
    style: PanelSwitcherStyle.BAR_WITH_BG
  }
};

export const Train: Story = {
  args: {
    style: PanelSwitcherStyle.TRAIN
  }
};
