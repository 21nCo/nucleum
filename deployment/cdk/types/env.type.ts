export type IEnvironment = ILamdbaEnvironmentVariables & {
  domain: string;
  subdomain?: string;
  allRegionList: string[];
  region: string;
  tidyregion: string;
  isUseParentZone?: boolean;
  /**
   * Email address to use for Let's Encrypt certificate generation and similar services
   */
  email: string;
};

export type ILamdbaEnvironmentVariables = {
  //DB_INSTANCE: string;
  DB: string;
  //MASTER_DB_INSTANCE: string;
  MASTER_DB: string;
  MASTER_DB_PASS: string;
  ADMIN_NS: string;
  ADMIN_DB_NAME: string;
  USER_NS: string;
  SPACE_NS: string;
  //TIDY_TOKEN_KEY
  TOKEN_NAME: string;
  TOKEN_PRIVATE_KEY: string;
  TOKEN_PUBLIC_KEY: string;
  DB_USER: string;
  DB_PASS: string;

  TIDY_SUBATOM?: string;

  //VITE_GOOGLE_SECRET
  OAUTH_GOOGLE_SECRET: string;
  //APPLE_OAUTH_SECRET
  OAUTH_APPLE_SECRET: string;

  FILE_BUCKET_PREFIX: string;
  TEMP_BUCKET_PREFIX: string;
  USE_THIRDPARTY_AUTH_METHOD?: string;
  URL_EXPIRATION_TIME?: string;
};
