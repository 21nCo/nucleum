import CommentEditor from "./CommentEditor.svelte";
export default {
  component: CommentEditor,
  parameters: { layout: "centered" }
};

export const Default = {};

export const withProps = {
  Component: CommentEditor,
  args: {}
};
