import * as cdk from "aws-cdk-lib";
import { Duration, aws_s3, aws_ecr_assets } from "aws-cdk-lib";
import { Construct } from "constructs";
import { CustomLambdaNestedStackProps } from "../types/customNestedStackProps.type";
import { generateFunctionName } from "../cdk.utils";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { defaults } from "../config";
import * as path from "path";
import { LambdaIntegration, MockIntegration } from "aws-cdk-lib/aws-apigateway";
export class PointronLambdaFunctions extends cdk.NestedStack {
  constructor(
    scope: Construct,
    id: string,
    props: CustomLambdaNestedStackProps,
    fileBuckets: aws_s3.IBucket[]
  ) {
    super(scope, id, props);

    const pythonRuntimeFunctionProps = {
      runtime: lambda.Runtime.PYTHON_3_10,
      timeout: Duration.minutes(defaults.timeout),
      code: lambda.Code.fromAsset(
        path.join(__dirname, "./../../../../src/endpoints/pointron/importJob")
      ),
      environment: props.lambdaEnvVars
    };
    const pointronEndpoint = props.api.root.addResource("pointron");

    const importJobFunction = new lambda.DockerImageFunction(
      this,
      `importJobFunction-${this.region}`,
      {
        code: lambda.DockerImageCode.fromImageAsset(
          path.join(
            __dirname,
            "./../../../../src/endpoints/pointron/importJob/image"
          ),
          {
            platform: aws_ecr_assets.Platform.LINUX_AMD64
          }
        ),
        environment: props.lambdaEnvVars,
        memorySize: 3008,
        // ephemeralStorageSize: cdk.Size.mebibytes(10240),
        timeout: cdk.Duration.seconds(900)
      }
    );

    fileBuckets.forEach((x) => x.grantReadWrite(importJobFunction));

    const importEndpoint = pointronEndpoint.addResource("import");
    importEndpoint.addMethod("POST", new LambdaIntegration(importJobFunction));
    importEndpoint.addMethod(
      "OPTIONS",
      new MockIntegration(defaults.mockIntegration),
      defaults.mockIntegrationOptions
    );

    const pingFunction = new lambda.Function(this, "pythonPingFunction", {
      handler: "ping.lambdaHandler",
      functionName: generateFunctionName(
        "pythonPingFunction",
        props.environment
      ),
      ...pythonRuntimeFunctionProps
    });
    const pingResource = pointronEndpoint.addResource("ping");
    pingResource.addMethod("POST", new LambdaIntegration(pingFunction));
    pingResource.addMethod(
      "OPTIONS",
      new MockIntegration(defaults.mockIntegration),
      defaults.mockIntegrationOptions
    );
  }
}
