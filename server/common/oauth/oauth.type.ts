export type OAuthUserData = {
  email: string;
  sub?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  given_name?: string;
  picture?: string;
  email_verified?: boolean;
  is_private_email?: boolean;
  id?: string;
};

export type IOAuthProviderConfig = {
  oauth_slug: string;
  client_id: string;
  scope: string;
  provider: string;
  authorise_url: string;
  token_url: string;
  userdata_url: string;
  userdata_method: string;
  response_mode: string;
  key_id: string;
  team_id: string;
  code_challenge_method: string;
};
