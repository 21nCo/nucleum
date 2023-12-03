import type { Meta, StoryObj } from "@storybook/svelte";

import Button from "./Button.svelte";
import { Size } from "$lib/tidy/types/size.enum";

/**
 * some description
 */
const meta = {
  component: Button,
  argTypes: {
    size: {
      control: { type: "select" },
      options: [Size.sm, Size.md, Size.lg],
    },
    type: {
      control: { type: "select" },
      options: ["primary", "secondary"],
    },
  },
} satisfies Meta<Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: {
    type: "primary",
    label: "Primary",
  },
};

export const Secondary: Story = {
  args: {
    label: "Secondary",
  },
};

export const Large: Story = {
  args: {
    size: Size.lg,
    label: "Button",
  },
};
export const Medium: Story = {
  args: {
    size: Size.md,
    label: "Button",
  },
};

export const Small: Story = {
  args: {
    size: Size.sm,
    label: "Button",
  },
};
