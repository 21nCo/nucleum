export type UserAccount = {
  dataMode: UserDataMode;
  userId?: string;
  token?: string;
  userInfo?: UserInformation;
  sessionType: UserSessionType;
};

export type UserInformation = {
  id: string;
  email: string;
  nickName: string;
  phone?: string;
  joinDate: Date;
  lastLogin: Date;
  profilePictureUrl?: string;
  emailParts?: EmailParts;
  licenseType?: LicenseType;
  isBootstrapped?: boolean;
  region?: string;
};

export type EmailParts = {
  characterCount: number;
  emailDomain: string;
  firstFew: string;
  lastFew?: string;
};

export enum LicenseType {
  EA_LIFETIME = "EA_LIFETIME",
  EA_EXTENDED = "EA_EXTENDED",
  LIFETIME = "LIFETIME",
  YEARLY = "YEARLY",
  MONTHLY = "MONTHLY",
  FREE = "FREE"
}

export enum UserDataMode {
  NONE = "NONE",
  LOCAL = "LOCAL",
  CLOUD = "CLOUD"
}

export enum UserSessionType {
  UNDETERMINED = "UNDETERMINED",
  NEW = "NEW",
  RETURNING = "RETURNING"
}
