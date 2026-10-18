import { isRecordId } from "@nucleum/datafn/resource.utils";
import type { IAvatar } from "@21n/ui/elements/avatarPicker/avatar.type";
import { isValidString } from "@21n/shared-utils/text.utils";

/** Accepts an emoji/icon avatar or a file avatar that references a stored file record. */
export function isValidAvatar(avatar: IAvatar | undefined) {
  return (
    avatar &&
    typeof avatar === "object" &&
    (("code" in avatar && isValidString(avatar.code)) ||
      ("file" in avatar && isRecordId(avatar.file)))
  );
}
