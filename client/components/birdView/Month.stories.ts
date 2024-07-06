import type { Meta, StoryObj } from "@storybook/svelte";

import Birdview from "./Birdview.svelte";
import Month from "./Month.svelte";
const meta = {
  component: Month,
  
} satisfies Meta<Month>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {

};
