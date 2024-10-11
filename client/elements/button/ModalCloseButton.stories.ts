import type { Meta, StoryObj } from "@storybook/svelte";
import ModalCloseButton from "./FullScreenCloseButton.svelte";
const meta = {
  component: ModalCloseButton,
  argTypes: {
    path: { control: "text" }
  },
  args: {
    path: "sample-path"
  }
} satisfies Meta<ModalCloseButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
