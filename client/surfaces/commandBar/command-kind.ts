/** Maps configured action kinds to command-palette categories. */
export function generateCmdType(actionType: string) {
  switch (actionType) {
    case "PAGE":
      return "page";
    case "MODAL":
    case "FUNCTION":
      return "action";
    case "LINK":
      return "link";
    default:
      return "action";
  }
}
