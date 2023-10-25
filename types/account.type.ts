export type UserAccount = {
  userId?: string;
  token: string | null;
  isLoggedIn: boolean;
  userInfo?: UserInformation;
};

export type UserInformation = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  joinDate: Date;
  lastLogin: Date;
  profilePicture?: string;
};
