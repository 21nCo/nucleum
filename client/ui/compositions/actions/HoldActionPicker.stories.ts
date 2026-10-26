import HoldActionPicker from "@21n/ui/compositions/actions/HoldActionPicker.svelte";

export default {
  component: HoldActionPicker,
  parameters: { layout: "centered" }
};

export const Default = {};

export const WithProps = {
  args: {
    IconsList: ["music", "microphone", "camera", "video-camera"]
  }
};
