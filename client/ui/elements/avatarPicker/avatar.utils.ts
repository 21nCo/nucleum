import type { IAvatar } from "@21n/ui/elements/avatarPicker/avatar.type";
import { isValidString } from "@21n/shared-utils/text.utils";

export function isValidAvatar(avatar: IAvatar | undefined) {
  return (
    avatar &&
    typeof avatar === "object" &&
    (("code" in avatar && isValidString(avatar.code)) ||
      ("file" in avatar && isValidString(avatar.file)))
  );
}
