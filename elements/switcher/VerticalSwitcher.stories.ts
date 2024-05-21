import type { Meta, StoryObj } from "@storybook/svelte";
import VerticalSwitcher from "./VerticalSwitcher.svelte";
import { VerticalSwitcherStyle } from "$lib/tidy/types/switcher.enum";
import { Size } from "$lib/tidy/types/size.enum";
import { Direction } from "$lib/tidy/types/direction.enum";

const meta = {
  component: VerticalSwitcher,
  argTypes: {
    items: {
      control: { type: "object" },
      description: "Array of items to display in the switcher",
      table: {
        type: { summary: "Array<{ icon: string, label: string }>" }
      }
    },
    selected: {
      control: { type: "text" },
      description: "The currently selected item",
      table: {
        type: { summary: "string" }
      }
    },
    style: {
      control: { type: "select" },
      description: "Style of the switcher",
      options: [VerticalSwitcherStyle.BAR, VerticalSwitcherStyle.GRADIENT]
    },
    itemProps: {
      // size: {
      //   control: { type: "select" },
      //   options: [Size.xxs, Size.xs, Size.sm, Size.md, Size.lg, Size.xl]
      // },
      // activeStatusPlacement: {
      //   control: { type: "select" },
      //   options: [Direction.Left, Direction.Right]
      // },
      isHideLabel: Boolean
    }
  }
} satisfies Meta<VerticalSwitcher>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    items: [
      {
        icon: "rectangle-group",
        label: "overview"
      },
      {
        icon: "chart",
        label: "analytics"
      },
      {
        icon: "clock",
        label: "logs"
      }
    ],
    selected: "overview",
    style: VerticalSwitcherStyle.BAR,
    itemProps: {
      size: Size.md,
      activeStatusPlacement: Direction.Right
    }
  }
};

export const Left: Story = {
  args: {
    items: [...Default.args.items],
    selected: "overview",
    style: VerticalSwitcherStyle.BAR,
    itemProps: {
      size: Size.md,
      activeStatusPlacement: Direction.Left
    }
  }
};

export const Right: Story = {
  args: {
    items: [...Default.args.items],
    selected: "overview",
    style: VerticalSwitcherStyle.BAR,
    itemProps: {
      size: Size.md,
      activeStatusPlacement: Direction.Right
    }
  }
};
export const LeftWithoutLabels: Story = {
  args: {
    items: [
      {
        icon: "list",
        label: "Table of contents"
      },
      {
        icon: "info",
        label: "Information"
      },
      {
        icon: "bookmark",
        label: "traces"
      }
    ],
    selected: "Information",
    style: VerticalSwitcherStyle.BAR,
    itemProps: {
      size: Size.md,
      activeStatusPlacement: Direction.Left,
      isHideLabel: true
    }
  }
};
export const RightWithoutLabels: Story = {
  args: {
    ...LeftWithoutLabels.args,
    itemProps: {
      size: Size.md,
      activeStatusPlacement: Direction.Right,
      isHideLabel: true
    }
  }
};
