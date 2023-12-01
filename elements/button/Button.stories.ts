import type { Meta, StoryObj } from "@storybook/svelte";

import Button from "./Button.svelte";
import { Size } from "$lib/tidy/types/size.enum";

// More on how to set up stories at: https://storybook.js.org/docs/writing-stories
const meta = {
  title: "Tidy lib/elements/Button",
  component: Button,
  tags: ["autodocs"],
  argTypes: {
    size: {
      control: { type: "select" },
      options: ["small", "medium", "large"],
    },
  },
} satisfies Meta<Button>;

export default meta;
type Story = StoryObj<typeof meta>;

// More on writing stories with args: https://storybook.js.org/docs/writing-stories/args
export const Primary: Story = {
  args: {
    type: "primary",
    label: "Button",
  },
};

export const Secondary: Story = {
  args: {
    label: "Button",
  },
};

export const Large: Story = {
  args: {
    size: Size.lg,
    label: "Button",
  },
};

export const Small: Story = {
  args: {
    size: Size.sm,
    label: "Button",
  },
};
