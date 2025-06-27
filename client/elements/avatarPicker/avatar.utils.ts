import { isRecordId } from "$lib/client/components/flux/resourceStores/resource.utils";
import type { IAvatar } from "$lib/client/types/avatar.type";
import { isValidString } from "$lib/shared/utils/text.utils";

export function isValidAvatar(avatar: IAvatar | undefined) {
  return (
    avatar &&
    typeof avatar === "object" &&
    (("code" in avatar && isValidString(avatar.code)) ||
      ("file" in avatar && isRecordId(avatar.file)))
  );
}
