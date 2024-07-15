import { CfnOutput, NestedStack, Stack } from "aws-cdk-lib";
import { Construct } from "constructs";
import { IEnvironment, ILamdbaEnvironmentVariables } from "../types/env.type";
import {
  CustomLambdaNestedStackProps,
  CustomNestedStackProps
} from "../types/customNestedStackProps.type";
import { AccountLambdaFunctions } from "./accountLambdaFunctions";
import { ApiGateway, ApiGatewayDomain } from "aws-cdk-lib/aws-route53-targets";
import * as path from "path";
import { Route53HealthCheck } from "../route53HealthCheck";
import { generateFunctionName, resolveAcmCertificate } from "../cdk.utils";
import { UtilsLambdaFunctions } from "./utilsLambdaFunctions";
import { SpacesLambdaFunctions } from "./spacesLambdaFunctions";
import { ICertificate } from "aws-cdk-lib/aws-certificatemanager";
import {
  BasePathMapping,
  DomainName,
  EndpointType,
  IDomainName,
  LambdaIntegration,
  LambdaRestApi
} from "aws-cdk-lib/aws-apigateway";
import { Code, Function, Runtime } from "aws-cdk-lib/aws-lambda";
import { Bucket, IBucket } from "aws-cdk-lib/aws-s3";
import {
  ARecord,
  CfnHealthCheck,
  CfnRecordSet,
  IHostedZone,
  RecordTarget
} from "aws-cdk-lib/aws-route53";
import { pick } from "./../../deploy.utils";

export class ServerlessRegionalStack extends NestedStack {
  certificate: ICertificate;
  regionDomain: string;
  api: LambdaRestApi;
  healthCheck: CfnHealthCheck;
  env: IEnvironment;
  zone: IHostedZone;
  subdomain: string = "api";
  constructor(scope: Construct, id: string, props: CustomNestedStackProps) {
    super(scope, id, props);
    this.env = props.environment;
    this.zone = props.zone;
    const lambdaEnvKeys = Object.keys(
      {} as ILamdbaEnvironmentVariables
    ) as Array<keyof ILamdbaEnvironmentVariables>;
    let lambdaEnvVars = pick(props.environment, lambdaEnvKeys);
    lambdaEnvVars = {
      ...lambdaEnvVars,
      USE_THIRDPARTY_AUTH_METHOD: "true",
      URL_EXPIRATION_TIME: "300"
    };
    console.log("initializing ServerlessRegionalStack - ", {
      region: this.region,
      tidyregion: props.environment.tidyregion
    });
    this.regionDomain =
      props.environment.tidyregion +
      "." +
      this.subdomain +
      "." +
      props.environment.domain;
    this.certificate = resolveAcmCertificate(
      this,
      props.zone,
      this.regionDomain
    );
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
        domainName: this.regionDomain,
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
    // this.addRoute53ARecord();
    this.addMultiRegionRoute53Config();
  }

  // addRoute53ARecord() {
  //   console.log("adding route53 A record", {
  //     region: this.region,
  //     regionDomain: this.regionDomain
  //   });
  //   const domain = new DomainName(this, `Domain${this.regionDomain}`, {
  //     domainName: this.regionDomain,
  //     certificate: this.certificate,
  //     endpointType: EndpointType.REGIONAL
  //   });
  //   new BasePathMapping(this, `Mapping${this.regionDomain}`, {
  //     domainName: domain,
  //     restApi: this.api
  //   });
  //   const aRecord = new ARecord(this, "apidevDNS", {
  //     zone: this.zone,
  //     recordName: this.regionDomain,
  //     target: RecordTarget.fromAlias(new ApiGateway(this.api))
  //   });

  //   new CfnOutput(this, "ApiStandaloneUrl", {
  //     value: aRecord.domainName
  //   });
  // }
  addRoute53ARecord(createNewResources: boolean = true) {
    console.log("Adding Route53 A record", {
      region: this.region,
      regionDomain: this.regionDomain,
      createNewResources
    });

    let domain: IDomainName;
    const stack = Stack.of(this);

    // Check if the domain name already exists
    const existingDomain = stack.node.tryFindChild(
      `Domain${this.regionDomain}`
    ) as DomainName;
    // const existingDomains = ApiGateway.fromAccount().getDomainNames();
    // const existingDomain = existingDomains.find(
    //   (d) => d.domainName === this.regionDomain
    // );

    if (existingDomain) {
      console.log("Using existing domain name");
      domain = existingDomain;
    } else if (createNewResources) {
      console.log("Creating new domain name");
      const domainLogicalId = `Domain${this.regionDomain.replace(/\./g, "")}`;
      const mappingLogicalId = `Mapping${this.regionDomain.replace(/\./g, "")}`;

      domain = new DomainName(this, domainLogicalId, {
        domainName: this.regionDomain,
        certificate: this.certificate,
        endpointType: EndpointType.REGIONAL
      });

      console.log("Creating base path mapping");
      new BasePathMapping(this, mappingLogicalId, {
        domainName: domain,
        restApi: this.api
      });
    } else {
      throw new Error(
        `Domain ${this.regionDomain} does not exist and createNewResources is false`
      );
    }

    console.log("Creating or updating A record");
    const aRecord = new ARecord(this, "apidevDNS", {
      zone: this.zone,
      recordName: this.regionDomain,
      target: RecordTarget.fromAlias(new ApiGatewayDomain(domain))
    });

    new CfnOutput(this, "ApiStandaloneUrl", {
      value: aRecord.domainName
    });

    console.log("Route53 A record setup complete");
  }

  addMultiRegionRoute53Config() {
    new CfnRecordSet(this, "apiRouteRecordSet", {
      name: this.subdomain + "." + this.regionDomain,
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
          `arn:aws:s3:::` + `${this.env.FILE_BUCKET_PREFIX}.${region}`
        )
      );
    });
    this.env.allRegionList.forEach((region) => {
      fileBuckets.push(
        Bucket.fromBucketArn(
          this,
          `userFilesTempBucket-${region}`,
          `arn:aws:s3:::` + `${this.env.TEMP_BUCKET_PREFIX}.${region}`
        )
      );
    });
    return fileBuckets;
  }
}
