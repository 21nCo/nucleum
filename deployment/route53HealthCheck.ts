import * as cdk from "aws-cdk-lib/core";
import apigateway = require("aws-cdk-lib/aws-apigateway");
import { Fn } from "aws-cdk-lib/core";
import * as route53 from "aws-cdk-lib/aws-route53";

export class Route53HealthCheck {
  healthCheck: route53.CfnHealthCheck;

  constructor(
    stack: cdk.Stack,
    restApi: apigateway.LambdaRestApi,
    region: string
  ) {
    let fullyQualifiedDomainName = Fn.join("", [
      restApi.restApiId,
      ".execute-api.",
      region,
      ".",
      Fn.ref("AWS::URLSuffix"),
    ]);
    let healthCheckIdentifier = region + "-apihealthcheck";
    console.log("restApiUrl", restApi.url);
    this.healthCheck = new route53.CfnHealthCheck(stack, "HealthCheck", {
      healthCheckTags: [
        {
          key: "Name",
          value: healthCheckIdentifier,
        },
      ],
      healthCheckConfig: {
        // type: "HTTPS_STR_MATCH",
        type: "HTTPS",
        failureThreshold: 1,
        fullyQualifiedDomainName,
        // searchString: "OK",
        resourcePath: Fn.join("", [
          "/",
          restApi.deploymentStage.stageName,
          "/ping",
        ]),
      },
    });

    // const healthCheck = new route53.CfnHealthCheck(stack, "HealthCheck", {
    //     healthCheckConfig: {
    //       type: "HTTPS",
    //       fullyQualifiedDomainName: `api.${region}.mydomain.com`,
    //       resourcePath: "/ping", // replace with the actual health check path
    //       requestInterval: 30,
    //       failureThreshold: 3,
    //     },
    //   });
  }
}
