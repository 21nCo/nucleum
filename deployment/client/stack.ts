import * as cdk from "aws-cdk-lib";
import { ClientConstruct } from "./clientConstruct";

const domain = process.env.domain ?? "tidigit.dev";
const subdomain = process.env.subdomain;
const appName = (subdomain ?? "") + domain.split(".")[0];
const isUseParentZone = process.env.isUseParentZone != "false";

console.log("FrontendStack", {
  appName,
  domain,
  subdomain,
  isUseParentZone
});

export class ClientStack extends cdk.Stack {
  constructor(parent: cdk.App, name: string) {
    super(parent, name, {
      env: {
        account: process.env.CDK_DEFAULT_ACCOUNT ?? process.env.account,
        region: "us-east-1"
      }
    });
    new ClientConstruct(this, `${appName}Frontend`, {
      domain,
      subdomain,
      isUseParentZone
    });
  }
}

const app = new cdk.App();

new ClientStack(app, `${appName}FrontendStack`);
