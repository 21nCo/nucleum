export type DatabaseQueryParams = {
  query: string;
  dbType: CONTEXT;
  db?: string;
  instance?: string;
};

export enum CONTEXT {
  ADMIN = "ADMIN",
  USER = "USER",
  SPACE = "SPACE"
}

export type Agent = {
  id: string;
  context: string;
  db: string;
  region: string;
  scope?: string;
  role?: string;
  ns?: string;
  tk?: string;
  iss?: string;
};

export type Context = {};

export enum SpaceAction {
  CREATE = "create",
  SWITCH = "switch",
  GET_ALL = "get_all"
}

export enum MemberRole {
  ADMIN = "admin",
  MEMBER = "member"
}

export type IActivity = {
  activity: string;
};
