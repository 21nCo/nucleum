import { HostedZone, IHostedZone } from "aws-cdk-lib/aws-route53";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import { Stack } from "aws-cdk-lib";
import { IBaseEnvironmentVariables } from "./types/env.type";
import { Construct } from "constructs";
import { LayerVersion } from "aws-cdk-lib/aws-lambda";
import { resolveDomainName } from "../deploy.utils";

export function generateFunctionName(
  prefix: string,
  env: IBaseEnvironmentVariables,
  x?: Stack
) {
  if (env.subdomain) return `${prefix}_${env.subdomain}_${env.region}`;
  return `${prefix}_${env.region}`;
}

export function resolveAcmCertificate(
  scope: Construct,
  zone: IHostedZone,
  domain: string
) {
  return new acm.Certificate(scope, `${domain}-certificate`, {
    domainName: domain,
    subjectAlternativeNames: [`*.${domain}`],
    validation: acm.CertificateValidation.fromDns(zone),
  });
}

export function resolveCommonResources(
  scope: Stack,
  props: {
    domain: string;
    subdomain?: string;
    isUseParentZone?: boolean;
  }
) {
  const zone = HostedZone.fromLookup(scope, "baseZone", {
    domainName:
      props.isUseParentZone || !props.subdomain
        ? props.domain
        : resolveDomainName(props),
  });
  const bunRuntimeLayer = LayerVersion.fromLayerVersionArn(
    scope,
    "BunLayer",
    `arn:aws:lambda:${scope.region}:${scope.account}:layer:bun:1`
  );
  return { zone, bunRuntimeLayer };
}
