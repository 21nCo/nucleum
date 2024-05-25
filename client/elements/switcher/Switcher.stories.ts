import type { Meta, StoryObj } from "@storybook/svelte";

import Switcher from "./Switcher.svelte";

import { Size } from "$lib/client/types/size.enum";
import {
  SelectionItemActiveStyle,
  SwitcherStyle
} from "$lib/client/types/switcher.enum";
import { Orientation } from "$lib/client/types/direction.enum";
const meta = {
  component: Switcher,
  argTypes: {
    labelOrientation: {
      control: {
        type: "select"
      },
      options: [Orientation.Horizontal, Orientation.Vertical]
    },
    selectionStyle: {
      control: {
        type: "select"
      },
      options: [
        SelectionItemActiveStyle.ACCENTROUNDEDBACKGROUND,
        SelectionItemActiveStyle.ACCENT_BACKGROUND,
        SelectionItemActiveStyle.ACCENT_COLOR,
        SelectionItemActiveStyle.BG_COLOR,
        SelectionItemActiveStyle.BOTTOMBAR,
        SelectionItemActiveStyle.BOTTOMDOT,
        SelectionItemActiveStyle.CIRCLE,
        SelectionItemActiveStyle.CIRCLE_WITH_BACKGROUND,
        SelectionItemActiveStyle.NONE,
        SelectionItemActiveStyle.SIDEBAR,
        SelectionItemActiveStyle.SIDEDOT,
        SelectionItemActiveStyle.UNKNOWN
      ]
    },
    size: {
      control: { type: "select" },
      options: [Size.sm, Size.md, Size.lg]
    },
    activeColor: { control: { type: "range", min: -1, max: 255, step: 1 } },
    isDisableEnabled: { control: "boolean" },
    parentBackgroundIndex: {
      control: { type: "number", min: 0, max: 3, step: 1 }
    }
  },
  args: {
    items: [
      "Item 1",
      "Item 2 length",
      "Item 3 length lengthy",
      "Item 4 length lengthy lengthier",
      "Item 5 length lengthy lengthier lenthiest"
    ],
    selectionStyle: SelectionItemActiveStyle.UNKNOWN,
    selectedIndex: 0,
    label: "sample_label",
    // info: "sample_info replaces info params",
    infoParams: {
      body: "This is a sample info text",
      link: "https://app.pointron.io/signup",
      linkText: "Learn more"
    },
    activeColor: undefined,
    isDisableEnabled: false,
    parentBackgroundIndex: 1,
    size: Size.md,
    labelOrientation: Orientation.Vertical
  }
} satisfies Meta<Switcher>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    style: SwitcherStyle.HorizontalAndWraps
  }
};
export const Horizontal: Story = {
  args: {
    style: SwitcherStyle.Horizontal
  }
};

export const HorizontalAndWraps: Story = {
  args: {
    style: SwitcherStyle.HorizontalAndWraps
  }
};

export const Vertical: Story = {
  args: {
    style: SwitcherStyle.Vertical
  }
};
