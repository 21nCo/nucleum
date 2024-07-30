import { CfnOutput, Duration, NestedStack } from "aws-cdk-lib";
import { Construct } from "constructs";
import { IEnvironment } from "../types/env.type";
import {
  CustomLambdaNestedStackProps,
  CustomNestedStackProps
} from "../types/customNestedStackProps.type";
import { AccountLambdaFunctions } from "./accountLambdaFunctions";
import { ApiGateway } from "aws-cdk-lib/aws-route53-targets";
import * as path from "path";
import { Route53HealthCheck } from "../route53HealthCheck";
import { generateFunctionName, resolveAcmCertificate } from "../cdk.utils";
import { UtilsLambdaFunctions } from "./utilsLambdaFunctions";
import { SpacesLambdaFunctions } from "./spacesLambdaFunctions";
import { ICertificate } from "aws-cdk-lib/aws-certificatemanager";
import {
  EndpointType,
  LambdaIntegration,
  LambdaRestApi
} from "aws-cdk-lib/aws-apigateway";
import { Code, Function, Runtime } from "aws-cdk-lib/aws-lambda";
import { Bucket, IBucket } from "aws-cdk-lib/aws-s3";
import {
  ARecord,
  CfnHealthCheck,
  CfnRecordSet,
  CnameRecord,
  IHostedZone,
  RecordTarget
} from "aws-cdk-lib/aws-route53";

export class ServerlessRegionalStack extends NestedStack {
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
  env: IEnvironment;
  zone: IHostedZone;
  constructor(scope: Construct, id: string, props: CustomNestedStackProps) {
    super(scope, id, props);
    this.env = props.environment;
    this.zone = props.zone;
    let lambdaEnvVars = {
      ...this.env.lambdaEnv,
      USE_THIRDPARTY_AUTH_METHOD: "true",
      URL_EXPIRATION_TIME: "300"
    };
    console.log("initializing ServerlessRegionalStack - ", {
      region: this.region,
      tidyregion: this.env.tidyregion
    });
    this.domainName = "api." + this.env.domain;
    this.regionDomainName = this.env.tidyregion + "-" + this.domainName;
    this.certificate = resolveAcmCertificate(this, props.zone, this.env.domain);
    const fileBuckets = this.resolveFilesBucket();
    this.generateApi();
    const lambaProps: CustomLambdaNestedStackProps = {
      ...props,
      api: this.api,
      lambdaEnvVars
    };
    new UtilsLambdaFunctions(this, "UtilsStack", lambaProps, fileBuckets);
    new AccountLambdaFunctions(this, "AccountStack", lambaProps);
    new SpacesLambdaFunctions(this, "SpacesStack", lambaProps);
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
    let pingFunction = new Function(this, "gatewayping", {
      handler: "ping.handler",
      functionName: generateFunctionName("gatewayping", this.env),
      code: Code.fromAsset(
        path.join(__dirname, "./../../../../src/endpoints/utils")
      ),
      runtime: Runtime.NODEJS_20_X
    });

    this.api = new LambdaRestApi(this, "api", {
      proxy: false,
      handler: pingFunction,
      domainName: {
        domainName: this.domainName,
        certificate: this.certificate,
        endpointType: EndpointType.REGIONAL
      },
      deployOptions: {
        stageName: "less"
      }
    });
    this.api.root.addMethod("GET", new LambdaIntegration(pingFunction));
    let pingResource = this.api.root.addResource("ping");
    pingResource.addMethod("GET", new LambdaIntegration(pingFunction));
    new CfnOutput(this, "Api root URL", {
      value: this.api.url
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
      regionDomain: this.regionDomainName
    });
    const apiDomainName = this.api.domainName?.domainName;

    if (!apiDomainName) {
      throw new Error("API Gateway domain name is not set");
    }
    new CnameRecord(this, "ApiDomainCnameRecord", {
      zone: this.zone,
      recordName: this.regionDomainName,
      domainName: apiDomainName,
      ttl: Duration.minutes(5)
    });
  }

  /**
   * Adds a latency based route53 record for main domainName to route traffic to regional API Gateway using Latency based routing.
   *
   */
  addMultiRegionRoute53Config() {
    new CfnRecordSet(this, "apiRouteRecordSet", {
      name: this.domainName,
      type: "A",
      setIdentifier: this.region,
      healthCheckId: this.healthCheck.ref,
      region: this.region,
      aliasTarget: {
        hostedZoneId: this.api.domainName?.domainNameAliasHostedZoneId ?? "",
        dnsName: this.api.domainName?.domainNameAliasDomainName ?? ""
      },
      hostedZoneId: this.zone.hostedZoneId
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
          `arn:aws:s3:::` + `${this.env.lambdaEnv.FILE_BUCKET_PREFIX}.${region}`
        )
      );
    });
    this.env.allRegionList.forEach((region) => {
      fileBuckets.push(
        Bucket.fromBucketArn(
          this,
          `userFilesTempBucket-${region}`,
          `arn:aws:s3:::` + `${this.env.lambdaEnv.TEMP_BUCKET_PREFIX}.${region}`
        )
      );
    });
    return fileBuckets;
  }
}
