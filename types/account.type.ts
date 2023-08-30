export type UserAccount = {
  id?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  token: string | null;
  isLoggedIn: boolean;
};
