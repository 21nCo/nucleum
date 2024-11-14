import * as cdk from "aws-cdk-lib";
import { ClientStack } from "./clientStack";

const domain = process.env.domain ?? "tidigit.dev";
const subdomain = process.env.subdomain;
const appName = (subdomain ?? "") + domain.split(".")[0];
const isUseParentZone = process.env.isUseParentZone != "false";

console.log("FrontendStack", {
  appName,
  domain,
  subdomain,
  isUseParentZone,
  cdkDefaultAccount: process.env.CDK_DEFAULT_ACCOUNT,
  account: process.env.account
});

const app = new cdk.App();

new ClientStack(app, `client${appName}FrontendStack`, {
  domain,
  subdomain,
  isUseParentZone,
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT ?? process.env.account,
    region: "us-east-1"
  }
});
