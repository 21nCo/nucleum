import type { Meta, StoryObj } from "@storybook/svelte";

import CloseButton from "./CloseButton.svelte";
import { Size } from "$lib/client/types/size.enum";
import { ButtonVariant } from "$lib/client/types/button.type";

const meta: Meta<CloseButton> = {
  component: CloseButton,
  args: {
    params: {
      label: "Close",
      icon: "cross",
      callback: () => Promise.resolve(),
      size: Size.md
    }
  }
};

export default meta;
type Story = {
  args: {
    params?: {
      [key: string]: any;
      variant: ButtonVariant;
    };
  };
};

export const Primary: Story = {
  args: {
    params: {
      ...meta?.args?.params,
      variant: ButtonVariant.PRIMARY
    }
  }
};

export const Secondary: Story = {
  args: {
    params: {
      ...meta?.args?.params,
      variant: ButtonVariant.SECONDARY
    }
  }
};

export const Danger: Story = {
  args: {
    params: {
      ...meta?.args?.params,
      variant: ButtonVariant.DANGER
    }
  }
};

export const Tertiary: Story = {
  args: {
    params: {
      ...meta?.args?.params,
      variant: ButtonVariant.TERTIARY
    }
  }
};
