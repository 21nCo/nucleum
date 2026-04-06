import type { Meta, StoryObj } from "@storybook/svelte";

import BackButton from "@21n/elements/button/BackButton.svelte";

const meta = {
  component: BackButton,
  argTypes: {
    text: {
      control: { type: "text" }
    }
  }
} satisfies Meta<BackButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const defaultCase: Story = {
  args: {}
};
export const example1: Story = {
  args: {
    text: "example1"
  }
};
export const example2: Story = {
  args: {
    text: "example2"
  }
};
