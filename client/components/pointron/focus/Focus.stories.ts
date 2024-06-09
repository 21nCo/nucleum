import type { Meta, StoryObj } from "@storybook/svelte";
import Focus from "./Focus.svelte";

/**
 * some description
 */
const meta = {
  component: Focus,
} satisfies Meta<Focus>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {};
