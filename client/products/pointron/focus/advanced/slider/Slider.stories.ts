import type { Meta, StoryObj } from "@storybook/svelte";
import Slider from "./Slider.svelte";

/**
 * some description
 */
const meta = {
  component: Slider
} satisfies Meta<Slider>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {};
