export type UserAccount = {
  userId?: string;
  token: string | null;
  isLoggedIn: boolean;
  userInfo?: UserInformation;
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
