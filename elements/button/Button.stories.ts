import type { Meta, StoryObj } from "@storybook/svelte";
import Button from "./Button.svelte";
import { Size } from "$lib/tidy/types/size.enum";
import { Direction } from "$lib/tidy/types/direction.enum";
import { ButtonStyle, ButtonVariant } from "$lib/tidy/types/button.type";

const meta = {
  component: Button,
  argTypes: {
    size: {
      control: { type: "select" },
      options: [Size.xxs, Size.xs, Size.sm, Size.md, Size.lg, Size.xl]
    },
    type: {
      control: { type: "select" },
      options: [
        ButtonVariant.PRIMARY,
        ButtonVariant.SECONDARY,
        ButtonVariant.DANGER
      ]
    },
    toolTipPlacement: {
      control: { type: "select" },
      options: [Direction.Up, Direction.Down, Direction.Left, Direction.Right]
    },
    parentBackgroundIndex: {
      control: { type: "number", min: 0, max: 3, step: 1 }
    },
    style: {
      control: { type: "select" },
      options: [
        ButtonStyle.DEFAULT,
        ButtonStyle.PLAIN,
        ButtonStyle.OUTLINED,
        ButtonStyle.ROUNDED
      ]
    },
    isDisabled: { control: { type: "boolean" } },
    isStayActive: { control: { type: "boolean" } },
    isLoading: { control: { type: "boolean" } }
  },
  args: {
    size: Size.md,
    isDisabled: false,
    isStayActive: false
  }
} satisfies Meta<Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    label: "Default"
  }
};
export const Primary: Story = {
  args: {
    type: ButtonVariant.PRIMARY,
    label: "Primary"
  }
};

export const Secondary: Story = {
  args: {
    type: ButtonVariant.SECONDARY,
    label: "Secondary"
  }
};

export const Danger: Story = {
  args: {
    type: ButtonVariant.DANGER,
    label: "Danger"
  }
};

export const ButtonWithTooltipDefaultPlacement: Story = {
  args: {
    tooltip: "change tooltip position from below controls",
    label: "TT Button"
  }
};
export const LoadingButton: Story = {
  args: {
    tooltip: "A sample for loading button",
    label: "Loading",
    isLoading: true,
    type: "primary"
  }
};
