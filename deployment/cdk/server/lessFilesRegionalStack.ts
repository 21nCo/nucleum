import { CfnOutput, Duration, NestedStack } from "aws-cdk-lib";
import { Construct } from "constructs";
import { IFilesEnvironmentVariables } from "../types/env.type";
import {
  CustomFilesNestedStackProps,
  CustomFilesLambdaNestedStackProps,
} from "../types/customNestedStackProps.type";
import * as path from "path";
import { Route53HealthCheck } from "../route53HealthCheck";
import { generateFunctionName, resolveAcmCertificate } from "../cdk.utils";
import { FilesLambdaFunctions } from "./filesLambdaFunctions";
import { ICertificate } from "aws-cdk-lib/aws-certificatemanager";
import {
  EndpointType,
  LambdaIntegration,
  LambdaRestApi,
} from "aws-cdk-lib/aws-apigateway";
import { Code, Function, Runtime } from "aws-cdk-lib/aws-lambda";
import { Bucket, IBucket } from "aws-cdk-lib/aws-s3";
import {
  ARecord,
  CfnHealthCheck,
  CfnRecordSet,
  CnameRecord,
  IHostedZone,
  RecordTarget,
} from "aws-cdk-lib/aws-route53";

export class ServerlessFilesRegionalStack extends NestedStack {
  certificate: ICertificate;
  /**
   * Main domain which resolves to regional API Gateway using Latency based routing
   */
  domainName: string;
  /**
   * Subdomain which resolves to regional API Gateway using Regional routing
   */
  regionDomainName: string;
  api: LambdaRestApi;
  healthCheck: CfnHealthCheck;
  env: IFilesEnvironmentVariables;
  zone: IHostedZone;
  constructor(
    scope: Construct,
    id: string,
    props: CustomFilesNestedStackProps
  ) {
    super(scope, id, props);
    this.env = props.environment;
    this.zone = props.zone;

    console.log("initializing ServerlessFilesRegionalStack - ", {
      region: this.region,
      tidyregion: this.env.tidyregion,
    });
    this.domainName = "files." + this.env.domain;
    this.regionDomainName = this.env.tidyregion + "-" + this.domainName;
    this.certificate = resolveAcmCertificate(this, props.zone, this.env.domain);
    const fileBuckets = this.resolveFilesBucket();
    this.generateApi();
    const filesLambdaFunctionProps: CustomFilesLambdaNestedStackProps = {
      ...props,
      api: this.api,
    };
    new FilesLambdaFunctions(
      this,
      "FilesStack",
      filesLambdaFunctionProps,
      fileBuckets
    );
  }

  /**
   * Generates the regional API Gateway and adds the route53 record for the main domainName to route traffic to regional API Gateway using Regional routing.
   *
   * Note: adding `this.regionDomainName` and its corresponding certificate instead of `this.domainName` while configuring the domainName property in the LambdaRestApi causes CERT_COMMON_NAME_INVALID error. This is because latency based routing is being added to the main domainName but the certificate is instead generated for the regionDomainName.
   *
   * Separate CName records are added for each region to route traffic directly to regional API Gateway via regionalDomainName if required. To make this work, the main domainName certificate was kept a wildcard certificate like *.domain.com so that regional domains like insouth-api.domain.com can be added as CName records while api.domain.com still works as a latency based routing.
   *
   */
  generateApi() {
    let pingFunction = new Function(this, "filesApiPing", {
      handler: "ping.handler",
      functionName: generateFunctionName("filesApiPing", this.env),
      code: Code.fromAsset(path.join(__dirname, "./../../../../src")),
      runtime: Runtime.NODEJS_20_X,
    });

    this.api = new LambdaRestApi(this, "filesApi", {
      proxy: false,
      handler: pingFunction,
      domainName: {
        domainName: this.domainName,
        certificate: this.certificate,
        endpointType: EndpointType.REGIONAL,
      },
      deployOptions: {
        stageName: "less",
      },
    });
    this.api.root.addMethod("GET", new LambdaIntegration(pingFunction));
    let pingResource = this.api.root.addResource("ping");
    pingResource.addMethod("GET", new LambdaIntegration(pingFunction));
    new CfnOutput(this, "Api root URL", {
      value: this.api.url,
    });
    this.healthCheck = new Route53HealthCheck(
      this,
      this.api,
      this.region
    ).healthCheck;
    this.addMultiRegionRoute53Config();
    this.addRoute53CnameRecordForRegionalDomain();
  }

  addRoute53CnameRecordForRegionalDomain() {
    console.log("Adding Route53 CNAME record - for regional domain", {
      region: this.region,
      regionDomain: this.regionDomainName,
    });
    const apiDomainName = this.api.domainName?.domainName;

    if (!apiDomainName) {
      throw new Error("API Gateway domain name is not set");
    }
    new CnameRecord(this, "FilesApiDomainCnameRecord", {
      zone: this.zone,
      recordName: this.regionDomainName,
      domainName: apiDomainName,
      ttl: Duration.minutes(5),
    });
  }

  /**
   * Adds a latency based route53 record for main domainName to route traffic to regional API Gateway using Latency based routing.
   *
   */
  addMultiRegionRoute53Config() {
    new CfnRecordSet(this, "filesApiRouteRecordSet", {
      name: this.domainName,
      type: "A",
      setIdentifier: this.region,
      healthCheckId: this.healthCheck.ref,
      region: this.region,
      aliasTarget: {
        hostedZoneId: this.api.domainName?.domainNameAliasHostedZoneId ?? "",
        dnsName: this.api.domainName?.domainNameAliasDomainName ?? "",
      },
      hostedZoneId: this.zone.hostedZoneId,
    });
  }

  /**
   *
   * Note: Ensure that the buckets are created in all regions before running the stack
   * @returns the list of buckets to be used for storing files
   */
  resolveFilesBucket() {
    let fileBuckets: IBucket[] = [];
    this.env.allRegionList.forEach((region) => {
      fileBuckets.push(
        Bucket.fromBucketArn(
          this,
          `userFilesBucket-${region}`,
          `arn:aws:s3:::` + `${this.env.fileBucketPrefix}.${region}`
        )
      );
    });
    this.env.allRegionList.forEach((region) => {
      fileBuckets.push(
        Bucket.fromBucketArn(
          this,
          `userFilesTempBucket-${region}`,
          `arn:aws:s3:::` + `${this.env.tempBucketPrefix}.${region}`
        )
      );
    });
    return fileBuckets;
  }
}
