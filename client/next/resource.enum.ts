export const NextResource = {
  //Fellotron
  email: "email",
  fellow: "fellow",
  organization: "organization",

  //Finatron
  account: "account",
  transaction: "transaction",
  category: "category",
  budget: "budget",

  //Feedtron
  feed: "feed",
  source: "source",

  //Selftron
  habit: "habit",
  activity: "activity",
  quest: "quest",

  //Hometron
  thing: "thing",
} as const;

export type NextResource = (typeof NextResource)[keyof typeof NextResource];
