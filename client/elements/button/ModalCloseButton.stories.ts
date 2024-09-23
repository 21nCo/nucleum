import type { Meta, StoryObj } from "@storybook/svelte";

import ModalCloseButton from "./ModalCloseButton.svelte";
import { Placement } from "$lib/client/types/direction.enum";
const meta = {
  component: ModalCloseButton,
  argTypes: {
    path: { control: "text" },
    position: Placement
  },
  args: {
    path: "sample-path"
  }
} satisfies Meta<ModalCloseButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    position: Placement.BottomLeft
  }
};
export const BottomLeft: Story = {
  args: {
    position: Placement.BottomLeft
  }
};
export const TopLeft: Story = {
  args: {
    position: Placement.TopLeft
  }
};

export const TopRight: Story = {
  args: {
    position: Placement.TopRight
  }
};

export const BottomRight: Story = {
  args: {
    position: Placement.BottomRight
  }
};
