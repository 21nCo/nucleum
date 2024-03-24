import type { Meta, StoryObj } from "@storybook/svelte";
import VerticalSwitcher from "./VerticalSwitcher.svelte";
import { VerticalSwitcherStyle } from "$lib/tidy/types/switcher.enum";

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
    }
  }
} satisfies Meta<VerticalSwitcher>;

export default meta;
type Story = StoryObj<typeof meta>;

export const BarStyleWithLabels: Story = {
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
    style: VerticalSwitcherStyle.BAR
  }
};

export const BarStyleWithoutLabels: Story = {
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
    selected: "overview",
    style: VerticalSwitcherStyle.BAR,
    itemProps: {
      isHideLabel: true
    }
  }
};
