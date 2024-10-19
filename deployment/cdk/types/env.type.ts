export type IEnvironment = {
  /**
   * Name of the environment ex: dev, pre, live
   */
  environment: string;
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
  lambdaEnv: ILambdaEnvironmentVariables;
};

export type ILambdaEnvironmentVariables = {
  DOMAIN: string;
  DB_USER: string;
  DB_PASS: string;
  ADMIN_NS: string;
  ADMIN_DB_NAME: string;
  USER_NS: string;
  SPACE_NS: string;
  TOKEN_NAME: string;
  TOKEN_PRIVATE_KEY: string;
  TOKEN_PUBLIC_KEY: string;

  OAUTH_GOOGLE_SECRET: string;
  OAUTH_APPLE_SECRET: string;

  FILE_BUCKET_PREFIX: string;
  TEMP_BUCKET_PREFIX: string;
  USE_THIRDPARTY_AUTH_METHOD?: string;
  URL_EXPIRATION_TIME?: string;
  URL_EXPIRATION_TIME_GET?: string;
};
