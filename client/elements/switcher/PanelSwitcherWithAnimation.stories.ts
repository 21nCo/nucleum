import type { Meta, StoryObj } from "@storybook/svelte";

import PanelSwitcherWithAnimation from "./PanelSwitcherWithAnimation.svelte";

import { Size } from "$lib/client/types/size.enum";
import { PanelSwitcherStyle } from "$lib/client/types/switcher.enum";
const meta = {
  component: PanelSwitcherWithAnimation,
  argTypes: {
    items: { control: { type: "object" } },
    selected: { control: "text" },
    style: PanelSwitcherStyle,
    interval: { control: "number" }
  }
} satisfies Meta<PanelSwitcherWithAnimation>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Bar: Story = {
  args: {
    items: ["Item 1", "Item 2", "Item 3", "Item 4", "Item 5"],
    selected: "Item 2",
    style: PanelSwitcherStyle.BAR,
    interval: 4000
  }
};

export const Train: Story = {
  args: {
    items: ["Item 1", "Item 2", "Item 3", "Item 4", "Item 5"],
    selected: "Item 2",
    style: PanelSwitcherStyle.TRAIN,
    interval: 4000
  }
};
