import type { Meta, StoryObj } from "@storybook/svelte";
import OptionSelector from "./OptionSelector.svelte";
import { Size } from "$lib/tidy/types/size.enum";
import { OptionSelectorStyle } from "$lib/tidy/types/switcher.enum";
import { Orientation } from "$lib/tidy/types/direction.enum";

const meta = {
  component: OptionSelector,
  argTypes: {
    size: {
      control: { type: "select" },
      options: [Size.sm, Size.md]
    }
  },

  args: {
    items: [
      { label: "chevup", icon: "chevup", isDisabled: false },
      { label: "chevdown", icon: "chevdown", isDisabled: false },
      { label: "cross", icon: "cross", isDisabled: false }
    ],
    label: "sample items",
    selected: "chevup",
    size: Size.md,
    parentBackgroundIndex: 2,
    info: {
      body: "This is a sample info text",
      link: "https://app.pointron.io/signup",
      linkText: "Learn more"
    },
    labelOrientation: Orientation.Vertical
  }
} satisfies Meta<OptionSelector>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    style: OptionSelectorStyle.TRAIN,
    iconOrientation: Orientation.Horizontal
  }
};

export const Train: Story = {
  args: {
    style: OptionSelectorStyle.TRAIN,
    iconOrientation: Orientation.Horizontal
  }
};
export const TrainVerticalIcon: Story = {
  args: {
    style: OptionSelectorStyle.TRAIN,
    iconOrientation: Orientation.Vertical
  }
};
export const Outline: Story = {
  args: {
    style: OptionSelectorStyle.OUTLINE,
    iconOrientation: Orientation.Horizontal
  }
};
export const OutlineVerticalIcon: Story = {
  args: {
    style: OptionSelectorStyle.OUTLINE,
    iconOrientation: Orientation.Vertical
  }
};
export const CheckCircle: Story = {
  args: {
    style: OptionSelectorStyle.CHECK_CIRCLE,
    iconOrientation: Orientation.Horizontal
  }
};
// export const CheckCircleVerticalicon: Story = {
//   args: {
//     style: OptionSelectorStyle.CHECK_CIRCLE,
//     iconOrientation: Orientation.Vertical,
//   }
// };
