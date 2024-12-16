import { aws_s3, Duration, NestedStack } from "aws-cdk-lib";
import * as path from "path";
import { Construct } from "constructs";
import { CustomFilesLambdaNestedStackProps } from "../types/customNestedStackProps.type";
import { defaults } from "../config";
import { generateFunctionName } from "../cdk.utils";
import { Code, Function, LayerVersion, Runtime } from "aws-cdk-lib/aws-lambda";
import { LambdaIntegration, MockIntegration } from "aws-cdk-lib/aws-apigateway";

export class FilesLambdaFunctions extends NestedStack {
  constructor(
    scope: Construct,
    id: string,
    props: CustomFilesLambdaNestedStackProps,
    fileBuckets: aws_s3.IBucket[]
  ) {
    super(scope, id, props);
    const dependencyLayer = new LayerVersion(this, "FilesLayer", {
      code: Code.fromAsset(path.join(__dirname, "./../../../../src/layers")),
      compatibleRuntimes: [Runtime.NODEJS_20_X],
      license: "Apache-2.0",
      description: "A layer to hold the AWS SDK and other dependencies",
    });

    const nodeRuntimeFunctionProps = {
      runtime: Runtime.NODEJS_20_X,
      timeout: Duration.minutes(defaults.timeout),
      layers: [dependencyLayer],
      code: Code.fromAsset(path.join(__dirname, "./../../../../src/node-dist")),
      environment: {
        FILE_BUCKET_PREFIX: props.environment.fileBucketPrefix,
        TEMP_BUCKET_PREFIX: props.environment.tempBucketPrefix,
        URL_EXPIRATION_TIME: props.environment.urlExpirationTime ?? "300",
      },
    };

    const utils = props.api.root.addResource("utils");
    const utilsNodeResource = utils.addResource("n");
    let getSignedUrlNodeFunction = new Function(this, "getsignedurl", {
      functionName: generateFunctionName("getsignedurl", props.environment),
      handler: "getSignedUrl.handler",
      ...nodeRuntimeFunctionProps,
    });

    fileBuckets.forEach((x) => x.grantReadWrite(getSignedUrlNodeFunction));
    fileBuckets.forEach((x) => x.grantPutAcl(getSignedUrlNodeFunction));

    const getSignedUrlNodeResource =
      utilsNodeResource.addResource("getsignedurl");
    getSignedUrlNodeResource.addMethod(
      "POST",
      new LambdaIntegration(getSignedUrlNodeFunction)
    );
    getSignedUrlNodeResource.addMethod(
      "OPTIONS",
      new MockIntegration(defaults.mockIntegration),
      defaults.mockIntegrationOptions
    );
  }
}
