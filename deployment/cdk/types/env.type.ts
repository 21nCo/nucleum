export type IEnvironment = IBaseEnvironmentVariables & {
  allRegionList: string[];
  lambdaEnv: ILambdaEnvironmentVariables;
};

export type ILambdaEnvironmentVariables = {
  ENV: string;
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
  GOOGLE_GEO_API_KEY: string;
  UNSPLASH_ACCESS_KEY: string;
  DODO_BASE_URL: string;
  DODO_API_KEY: string;
  APPLE_ISSUER_ID: string;
  APPLE_KEY_ID: string;
  APPLE_BUNDLE_ID: string;
  APPLE_PRIVATE_KEY: string;

  FILE_BUCKET_PREFIX: string;
  TEMP_BUCKET_PREFIX: string;
  DYNAMODB_TABLE_PREFIX: string;
  USE_THIRDPARTY_AUTH_METHOD?: string;
  URL_EXPIRATION_TIME?: string;
  URL_EXPIRATION_TIME_GET?: string;
};

export type IDatabaseEnvironmentVariables = IBaseEnvironmentVariables & {
  dbPass: string;
};

export type IBaseEnvironmentVariables = {
  /**
   * Name of the environment ex: dev, pre, live
   */
  environment: string;
  domain: string;
  subdomain?: string;
  region: string;
  tidyregion: string;
  isUseParentZone?: boolean;
  /**
   * Email address to use for Let's Encrypt certificate generation and similar services
   */
  email: string;
};

export type IFilesEnvironmentVariables = IBaseEnvironmentVariables & {
  fileBucketPrefix: string;
  tempBucketPrefix: string;
  urlExpirationTime: string;
  urlExpirationTimeGet: string;
  allRegionList: string[];
  tokenPrivateKey: string;
};
