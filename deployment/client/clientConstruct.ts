#!/usr/bin/env node
import * as route53 from "aws-cdk-lib/aws-route53";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";
import * as targets from "aws-cdk-lib/aws-route53-targets";
import * as cloudfront_origins from "aws-cdk-lib/aws-cloudfront-origins";
import { CfnOutput, Duration, RemovalPolicy, Stack } from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";
import { CommonStack } from "../commonStack";
import type { ClientStackProps } from "../types/clientStackProps.type";
import { resolveDomainName } from "../deployutils";

export class ClientConstruct extends Construct {
  constructor(parent: Stack, name: string, props: ClientStackProps) {
    super(parent, name);
    const siteDomain = resolveDomainName(props);
    const { zone, certificate } = new CommonStack(this, "CommonStack", props, {
      domain: props.domain,
      subdomain: props.subdomain,
      isUseParentZone: props.isUseParentZone
    });
    const cloudfrontOAI = new cloudfront.OriginAccessIdentity(
      this,
      "cloudfront-OAI",
      {
        comment: `OAI for ${name}`
      }
    );

    new CfnOutput(this, "Site", { value: "https://" + siteDomain });

    const siteBucket = new s3.Bucket(this, "SiteBucket", {
      bucketName: siteDomain,
      publicReadAccess: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: RemovalPolicy.DESTROY, //TODO - check if needed for production
      autoDeleteObjects: true,
      versioned: true
    });

    siteBucket.addToResourcePolicy(
      new iam.PolicyStatement({
        actions: ["s3:GetObject"],
        resources: [siteBucket.arnForObjects("*")],
        principals: [
          new iam.CanonicalUserPrincipal(
            cloudfrontOAI.cloudFrontOriginAccessIdentityS3CanonicalUserId
          )
        ]
      })
    );
    new CfnOutput(this, "Bucket", { value: siteBucket.bucketName });

    new CfnOutput(this, "Certificate", { value: certificate.certificateArn });

    const distribution = new cloudfront.Distribution(this, "SiteDistribution", {
      certificate: certificate,
      defaultRootObject: "index.html",
      domainNames: [siteDomain],
      minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
      errorResponses: [
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: "/index.html",
          ttl: Duration.minutes(0)
        },
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: "/index.html",
          ttl: Duration.minutes(0)
        }
      ],
      defaultBehavior: {
        origin: new cloudfront_origins.S3Origin(siteBucket, {
          originAccessIdentity: cloudfrontOAI
        }),
        compress: true,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED
      }
    });

    new CfnOutput(this, "DistributionId", {
      value: distribution.distributionId
    });

    const recordTarget = route53.RecordTarget.fromAlias(
      new targets.CloudFrontTarget(distribution)
    );
    new route53.ARecord(this, `FrontEndARecord`, {
      recordName: siteDomain,
      target: recordTarget,
      zone
    });

    new s3deploy.BucketDeployment(this, "DeployWithInvalidation", {
      sources: [s3deploy.Source.asset("./../../../build")],
      destinationBucket: siteBucket,
      distribution,
      distributionPaths: ["/*"]
    });
  }
}
