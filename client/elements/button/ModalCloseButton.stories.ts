import type { Meta, StoryObj } from "@storybook/svelte";

import ModalCloseButton from "./ModalCloseButton.svelte";
import { Position } from "$lib/client/types/direction.enum";
const meta = {
  component: ModalCloseButton,
  argTypes: {
    path: { control: "text" },
    position: Position
  },
  args: {
    path: "sample-path"
  }
} satisfies Meta<ModalCloseButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    position: Position.BottomLeft
  }
};
export const BottomLeft: Story = {
  args: {
    position: Position.BottomLeft
  }
};
export const TopLeft: Story = {
  args: {
    position: Position.TopLeft
  }
};

export const TopRight: Story = {
  args: {
    position: Position.TopRight
  }
};

export const BottomRight: Story = {
  args: {
    position: Position.BottomRight
  }
};
