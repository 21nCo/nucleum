export type IUserProfileInfo = {
  id: string;
  emailhash: string;
  nickName: string;
  joinDate: string;
  profilePictureUrl?: string;
  emailParts?: EmailParts;
  /**
   * @deprecated Nucleus no longer routes users through bootstrap. This is kept
   * for legacy account/session metadata only.
   */
  isBootstrapped?: boolean;
  region?: string;
  isOAuth?: boolean;
  oAuthId?: string;
  phone?: string;
  pass?: string;
  passhash?: string;
  context?: any;
};

export type EmailParts = {
  characterCount: number;
  emailDomain: string;
  firstFew: string;
  lastFew?: string;
};
