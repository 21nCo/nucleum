import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { IHostedZone } from "aws-cdk-lib/aws-route53";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { resolveDomainName } from "./deployutils";

export class CommonStack extends cdk.NestedStack {
  /**
   *
   */
  zone: IHostedZone;
  certificate: acm.Certificate;
  certificateForSub?: acm.Certificate;
  bunRuntimeLayer: lambda.ILayerVersion;
  constructor(
    scope: Construct,
    id: string,
    props: cdk.NestedStackProps,
    env: { domain: string; subdomain?: string; isUseParentZone?: boolean }
  ) {
    super(scope, id, props);
    const domainName = resolveDomainName(env);
    console.log({ env, domainName });
    this.zone = route53.HostedZone.fromLookup(this, "baseZone", {
      domainName: env.isUseParentZone ? env.domain : domainName
    });
    this.certificate = new acm.Certificate(this, "Certificate", {
      domainName,
      validation: acm.CertificateValidation.fromDns(this.zone)
    });
    // this.certificateForSub = new acm.Certificate(this, "CertificateForSub", {
    //   domainName: `*.${domainName}`,
    //   validation: acm.CertificateValidation.fromDns(this.zone)
    // });
    this.bunRuntimeLayer = lambda.LayerVersion.fromLayerVersionArn(
      this,
      "BunLayer",
      `arn:aws:lambda:${this.region}:${this.account}:layer:bun:1`
    );
  }
}
