import CaptureComponent from "./CaptureComponent.svelte";

export default {
  title: "Tidy/CaptureComponent",
  component: CaptureComponent,
  parameters: { layout: "centered" }
};

export const Default = {};

export const WithProps = {
  args: {
    IconsList: ["music", "microphone", "camera", "video-camera"]
  }
};
