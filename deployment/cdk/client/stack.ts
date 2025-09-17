import * as cdk from "aws-cdk-lib";
import { ClientStack } from "./clientStack";

const domain = (process.env.domain ?? "tidigit.dev").replace(/\r/g, "");
const subdomain = process.env.subdomain?.replace(/\r/g, "");
const appName = (subdomain ?? "") + domain.split(".")[0];
const isUseParentZone = (process.env.isUseParentZone ?? "true").replace(/\r/g, "") != "false";

console.log("FrontendStack", {
  appName,
  domain,
  subdomain,
  isUseParentZone
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
