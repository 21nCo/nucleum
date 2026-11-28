import { IUserProfileInfo } from "@nucleum/schema/account/profile.type";

/**
 * The user fields returned to legacy clients. Optional fields are left out
 * when they are not set, so the response never carries an undefined value
 * (which the legacy JSON replacer would send as the truthy string "$NONE").
 */
export function frameNonSensitiveUserInfo(userInfo: IUserProfileInfo) {
  const {
    id,
    emailParts,
    nickName,
    profilePictureUrl,
    joinDate,
    region,
    isBootstrapped
  } = userInfo;
  return {
    id,
    ...(emailParts != null ? { emailParts } : {}),
    nickName,
    joinDate,
    ...(profilePictureUrl != null ? { profilePictureUrl } : {}),
    ...(region != null ? { region } : {}),
    ...(isBootstrapped != null ? { isBootstrapped } : {})
  };
}

export function getEmailParts(email: string) {
  const emailParts = email.split("@");
  const emailName = emailParts[0];
  const characterCount = emailName.length;
  let snapLength = 3;
  if (characterCount <= snapLength * 2) snapLength = 2;
  if (characterCount <= snapLength * 2) snapLength = 1;
  const firstFew = emailName.substring(0, snapLength);
  const lastFew = emailName.substring(emailName.length - snapLength);
  const emailDomain = emailParts[1];
  return {
    characterCount,
    firstFew,
    lastFew,
    emailDomain
  };
}
