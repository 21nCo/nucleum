import type { Meta, StoryObj } from "@storybook/svelte";

import Birdview from "@21n/components/calendar/birdView/Birdview.svelte";
const meta = {
  component: Birdview
} satisfies Meta<Birdview>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
