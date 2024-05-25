import type { Meta, StoryObj } from "@storybook/svelte";

import ModalCloseButton from "./ModalCloseButton.svelte";
import { Direction } from "$lib/client/types/direction.enum";
const meta = {
  component: ModalCloseButton,
  argTypes: {
    path: { control: "text" },
    position: Direction
  },
  args: {
    path: "sample-path"
  }
} satisfies Meta<ModalCloseButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    position: Direction.BottomLeft
  }
};
export const BottomLeft: Story = {
  args: {
    position: Direction.BottomLeft
  }
};
export const TopLeft: Story = {
  args: {
    position: Direction.TopLeft
  }
};

export const TopRight: Story = {
  args: {
    position: Direction.TopRight
  }
};

export const BottomRight: Story = {
  args: {
    position: Direction.BottomRight
  }
};
