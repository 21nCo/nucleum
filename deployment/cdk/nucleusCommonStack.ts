import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as gateway from "aws-cdk-lib/aws-apigateway";
import { CustomNestedStackProps } from "./cdk/types/customNestedStackProps.type";
import { IEnvironment } from "./cdk/types/env.type";

export class NucleusCommonStack extends cdk.NestedStack {
  /**
   *
   */
  fileBuckets: s3.IBucket[];
  api: gateway.LambdaRestApi;
  constructor(
    scope: Construct,
    id: string,
    props: CustomNestedStackProps,
    env: IEnvironment
  ) {
    super(scope, id, props);
    //TODO - removal policy - production
    // this.bucket = new s3.Bucket(this, "userFilesBucket", {
    //   bucketName: props.env.fileBucketName,
    //   removalPolicy: cdk.RemovalPolicy.DESTROY,
    // });
    env.allRegionList.forEach((region) => {
      this.fileBuckets.push(
        // new s3.Bucket(this, `userFilesBucket-${region}`, {
        //   bucketName: `${env.filesBucketPrefix}.${region}`,
        //   removalPolicy: cdk.RemovalPolicy.DESTROY,
        // })
        s3.Bucket.fromBucketArn(
          this,
          `userFilesBucket-${region}`,
          `arn:aws:s3:::` + `${env.filesBucketPrefix}.${region}`
        )
      );
    });
  }
}
