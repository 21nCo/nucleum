import { CfnOutput, NestedStack } from "aws-cdk-lib";
import { ARecord, RecordTarget, IHostedZone } from "aws-cdk-lib/aws-route53";
import {
  AwsCustomResource,
  AwsCustomResourcePolicy,
  PhysicalResourceId
} from "aws-cdk-lib/custom-resources";
import { PolicyStatement } from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";
import { readFileSync } from "fs";
import { CustomNestedStackProps } from "../types/customNestedStackProps.type";
import { ICertificate } from "aws-cdk-lib/aws-certificatemanager";
import { IEnvironment } from "../types/env.type";
import { resolveAcmCertificate } from "../cdk.utils";
import * as path from "path";

const LIGHTSAIL_SUPPORTED_REGIONS = [
  "us-east-1",
  "us-east-2",
  "us-west-2",
  "eu-west-1",
  "eu-west-2",
  "eu-central-1",
  "ap-southeast-1",
  "ap-southeast-2",
  "ap-northeast-1",
  "ca-central-1"
];

export class DatabaseLightsailRegionalStack extends NestedStack {
  env: IEnvironment;
  zone: IHostedZone;
  certificate: ICertificate;
  regionDomain: string;
  subdomain: string = "db";
  instanceName: string;
  staticIpName: string;

  constructor(scope: Construct, id: string, props: CustomNestedStackProps) {
    super(scope, id, props);
    const { zone, environment } = props;
    this.env = environment;
    this.zone = zone;
    this.regionDomain =
      props.environment.tidyregion +
      "." +
      this.subdomain +
      "." +
      environment.domain;
    this.certificate = resolveAcmCertificate(this, zone, this.regionDomain);
    this.instanceName = this.regionDomain;
    this.staticIpName = `${this.regionDomain}-static-ip`;

    if (!LIGHTSAIL_SUPPORTED_REGIONS.includes(this.env.region)) {
      throw new Error(
        `Lightsail is not supported in the ${
          this.env.region
        } region. Please choose one of the following regions: ${LIGHTSAIL_SUPPORTED_REGIONS.join(
          ", "
        )}`
      );
    }

    const existingDiskName = this.env.region + "-db-disk";
    const keypairName = this.env.region + "-keypair";

    // Create a key pair
    const keyPair = new AwsCustomResource(this, "LightsailKeyPair", {
      onCreate: {
        service: "Lightsail",
        action: "createKeyPair",
        parameters: {
          keyPairName: keypairName
        },
        physicalResourceId: PhysicalResourceId.of(keypairName)
      },
      onDelete: {
        service: "Lightsail",
        action: "deleteKeyPair",
        parameters: {
          keyPairName: keypairName
        }
      },
      policy: AwsCustomResourcePolicy.fromStatements([
        new PolicyStatement({
          actions: ["lightsail:CreateKeyPair", "lightsail:DeleteKeyPair"],
          resources: ["*"]
        })
      ])
    });

    // Create Lightsail instance
    const instance = new AwsCustomResource(this, "LightsailInstance", {
      onCreate: {
        service: "Lightsail",
        action: "createInstances",
        parameters: {
          instanceNames: [this.instanceName],
          availabilityZone: `${this.env.region}a`, // Use the first AZ in the region
          blueprintId: "amazon_linux_2023",
          bundleId: "small_3_0",
          keyPairName: keypairName
        },
        physicalResourceId: PhysicalResourceId.of(this.instanceName)
      },
      onDelete: {
        service: "Lightsail",
        action: "deleteInstance",
        parameters: {
          instanceName: this.instanceName
        }
      },
      policy: AwsCustomResourcePolicy.fromStatements([
        new PolicyStatement({
          actions: ["lightsail:CreateInstances", "lightsail:DeleteInstance"],
          resources: ["*"]
        })
      ])
    });

    // ... (keep the rest of the resources: disk attachment, static IP, etc.)

    // Get the actual IP address
    const getStaticIp = new AwsCustomResource(this, "GetStaticIp", {
      onCreate: {
        service: "Lightsail",
        action: "getStaticIp",
        parameters: {
          staticIpName: this.staticIpName
        },
        physicalResourceId: PhysicalResourceId.of(`${this.staticIpName}-ip`)
      },
      policy: AwsCustomResourcePolicy.fromStatements([
        new PolicyStatement({
          actions: ["lightsail:GetStaticIp"],
          resources: ["*"]
        })
      ])
    });

    const staticIpAddress = getStaticIp.getResponseField("staticIp.ipAddress");

    // Create A record with the actual IP address
    new ARecord(this, "DNSRecord", {
      zone: zone,
      recordName: this.regionDomain,
      target: RecordTarget.fromIpAddresses(staticIpAddress)
    });

    // ... (keep the rest of the code for opening ports, user data, etc.)

    // Output the public IP address and certificate ARN
    new CfnOutput(this, "InstancePublicIp", {
      value: staticIpAddress,
      description: "Public IP address of the Lightsail instance"
    });
    new CfnOutput(this, "CertificateArn", {
      value: this.certificate.certificateArn,
      description: "ARN of the ACM certificate"
    });
  }
}
