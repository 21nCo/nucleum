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
  profilePicture?: string;
  emailParts?: EmailParts;
};

export type EmailParts = {
  characterCount: number;
  emailDomain: string;
  firstFew: string;
  lastFew?: string;
};
