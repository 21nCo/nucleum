import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { CustomLambdaNestedStackProps } from "../types/customNestedStackProps.type";
import { ICertificate } from "aws-cdk-lib/aws-certificatemanager";
import { IEnvironment } from "../types/env.type";
import {
  ARecord,
  CnameRecord,
  IHostedZone,
  RecordTarget
} from "aws-cdk-lib/aws-route53";
import { resolveAcmCertificate } from "../cdk.utils";
import * as targets from "aws-cdk-lib/aws-route53-targets";
// import { LambdaFunction } from "aws-cdk/aws-route53-targets";

export class MemotronLambdaFunctions extends cdk.NestedStack {
  certificate: ICertificate;
  env: IEnvironment;
  zone: IHostedZone;
  constructor(
    scope: Construct,
    id: string,
    props: CustomLambdaNestedStackProps
  ) {
    super(scope, id, props);
    const transcriptionDomain =
      props.environment.tidyregion +
      "." +
      "taco-transcription" +
      "." +
      props.environment.domain;
    const certificate = resolveAcmCertificate(
      this,
      props.zone,
      transcriptionDomain
    );
    //TODO - move import/export jobs here
    const dockerFunc = new lambda.DockerImageFunction(this, "DockerFunc", {
      code: lambda.DockerImageCode.fromImageAsset(
        "./lib/server/memotron/Taco/whisperDockerImage"
      ),
      memorySize: 3008,
      timeout: cdk.Duration.seconds(300)
    });
    const functionUrl = dockerFunc.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
      cors: {
        allowedMethods: [lambda.HttpMethod.POST],
        allowedHeaders: ["*"],
        allowedOrigins: ["*"]
      }
    });

    new cdk.CfnOutput(this, "FunctionUrlValue", {
      value: functionUrl.url
    });

    // const aliasRecord = new ARecord(this, 'AliasRecord', {
    //   zone: this.zone,
    //   recordName: transcriptionDomain,
    //   target: RecordTarget.fromAlias(new targets.CloudFrontTarget(functionUrl)),
    // });
    new CnameRecord(this, "CnameRecord", {
      zone: props.zone,
      recordName: transcriptionDomain,
      domainName: functionUrl.url.replace("https://", "")
    });
  }
}

// import * as cdk from 'aws-cdk-lib';
// import { Construct } from 'constructs';
// import * as lambda from 'aws-cdk-lib/aws-lambda'

// export class WhisperFunctionUrlStack extends cdk.Stack {
//   constructor(scope: Construct, id: string, props?: cdk.StackProps) {
//     super(scope, id, props);

//     const dockerFunc= new lambda.DockerImageFunction(this,'DockerFunc',{
//       code:lambda.DockerImageCode.fromImageAsset('./image'),
//       memorySize: 3008,
//       timeout: cdk.Duration.seconds(300),
//     })
//     const functionUrl = dockerFunc.addFunctionUrl({
//       authType: lambda.FunctionUrlAuthType.NONE,
//       cors: {
//         allowedMethods: [lambda.HttpMethod.POST],
//         allowedHeaders: ["*"],
//         allowedOrigins: ["*"],
//       },
//     });

//     new cdk.CfnOutput(this, "FunctionUrlValue", {
//       value: functionUrl.url,
//     });
//   }
// }
