import { CfnOutput, CfnResource, NestedStack } from "aws-cdk-lib";
import { CfnInstance, CfnStaticIp } from "aws-cdk-lib/aws-lightsail";
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
    this.staticIpName = this.regionDomain + "-static-ip";
    const existingDiskName = this.env.region + "-db-disk";
    // 1. Create Lightsail instance

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
    // const keyPairCheck = new AwsCustomResource(this, "KeyPairCheck", {
    //   onCreate: {
    //     service: "Lightsail",
    //     action: "getKeyPair",
    //     parameters: {
    //       keyPairName: keypairName
    //     },
    //     physicalResourceId: PhysicalResourceId.of(`${keypairName}-check`)
    //   },
    //   policy: AwsCustomResourcePolicy.fromStatements([
    //     new PolicyStatement({
    //       actions: ["lightsail:GetKeyPair"],
    //       resources: ["*"]
    //     })
    //   ])
    // });

    // // keyPairCheck.node.addDependency(keyPair);
    /**
     *
     * aws lightsail get-blueprints
     * aws lightsail get-bundles
     */
    const instance = new CfnInstance(this, "LightsailInstance", {
      instanceName: this.regionDomain,
      availabilityZone: this.env.region,
      blueprintId: "amazon_linux_2023",
      bundleId: this.env.region === "ap-south-1" ? "small_3_1" : "small_3_0",
      keyPairName: keypairName
    });

    instance.node.addDependency(keyPair);

    // 2. Create custom resource for disk attachment
    new AwsCustomResource(this, "DiskAttachment", {
      onCreate: {
        service: "Lightsail",
        action: "attachDisk",
        parameters: {
          diskName: existingDiskName,
          instanceName: instance.instanceName,
          diskPath: "/dev/xvdf"
        },
        physicalResourceId: PhysicalResourceId.of(existingDiskName)
      },
      onDelete: {
        service: "Lightsail",
        action: "detachDisk",
        parameters: {
          diskName: existingDiskName
        }
      },
      policy: AwsCustomResourcePolicy.fromStatements([
        new PolicyStatement({
          actions: ["lightsail:AttachDisk", "lightsail:DetachDisk"],
          resources: ["*"]
        })
      ])
    });

    // 3. Create and attach static IP
    const staticIp = new CfnStaticIp(this, "LightsailStaticIp", {
      staticIpName: this.staticIpName,
      attachedTo: instance.ref
    });

    // // Custom resource for static IP attachment
    // new AwsCustomResource(this, "StaticIpAttachment", {
    //   onCreate: {
    //     service: "Lightsail",
    //     action: "attachStaticIp",
    //     parameters: {
    //       staticIpName: staticIp.staticIpName,
    //       instanceName: instance.instanceName
    //     },
    //     physicalResourceId: PhysicalResourceId.of(
    //       `${staticIp.staticIpName}-${instance.instanceName}`
    //     )
    //   },
    //   onDelete: {
    //     service: "Lightsail",
    //     action: "detachStaticIp",
    //     parameters: {
    //       staticIpName: staticIp.staticIpName
    //     }
    //   },
    //   policy: AwsCustomResourcePolicy.fromStatements([
    //     new PolicyStatement({
    //       actions: ["lightsail:AttachStaticIp", "lightsail:DetachStaticIp"],
    //       resources: ["*"]
    //     })
    //   ])
    // });

    // Get the actual IP address
    // const getStaticIp = new AwsCustomResource(this, "GetStaticIp", {
    //   onCreate: {
    //     service: "Lightsail",
    //     action: "getStaticIp",
    //     parameters: {
    //       staticIpName: this.staticIpName
    //     },
    //     physicalResourceId: PhysicalResourceId.of(`${this.staticIpName}-ip`)
    //   },
    //   policy: AwsCustomResourcePolicy.fromStatements([
    //     new PolicyStatement({
    //       actions: ["lightsail:GetStaticIp"],
    //       resources: ["*"]
    //     })
    //   ])
    // });

    // const staticIpAddress = getStaticIp.getResponseField("staticIp.ipAddress");

    // Create A record
    new ARecord(this, "DNSRecord", {
      zone: zone,
      recordName: this.regionDomain,
      target: RecordTarget.fromIpAddresses(staticIp.attrIpAddress)
    });

    // 4. Enable HTTPS and port 443 using custom resource
    new AwsCustomResource(this, "OpenPorts", {
      onCreate: {
        service: "Lightsail",
        action: "openInstancePublicPorts",
        parameters: {
          instanceName: instance.instanceName,
          portInfo: {
            fromPort: 80,
            toPort: 80,
            protocol: "tcp"
          }
        },
        physicalResourceId: PhysicalResourceId.of(
          `${instance.instanceName}-ports`
        )
      },
      onUpdate: {
        service: "Lightsail",
        action: "openInstancePublicPorts",
        parameters: {
          instanceName: instance.instanceName,
          portInfo: {
            fromPort: 443,
            toPort: 443,
            protocol: "tcp"
          }
        },
        physicalResourceId: PhysicalResourceId.of(
          `${instance.instanceName}-ports`
        )
      },
      policy: AwsCustomResourcePolicy.fromStatements([
        new PolicyStatement({
          actions: ["lightsail:OpenInstancePublicPorts"],
          resources: ["*"]
        })
      ])
    });

    // 5. User data script for instance setup
    const userDataScript = readFileSync(path.join(__dirname, "init.sh"), "utf8")
      .replace(/DOMAIN_NAME/g, this.regionDomain)
      .replace(/CERTIFICATE_ARN/g, this.certificate.certificateArn)
      .replace(/DB_PASS/g, this.env.DB_PASS);
    const encodedUserData = Buffer.from(userDataScript).toString("base64");

    // Update the instance to include user data
    instance.addPropertyOverride("UserData", encodedUserData);

    // Output the public IP address and certificate ARN
    new CfnOutput(this, "InstancePublicIp", {
      value: staticIp.ref,
      description: "Public IP address of the Lightsail instance"
    });
    new CfnOutput(this, "CertificateArn", {
      value: this.certificate.certificateArn,
      description: "ARN of the ACM certificate"
    });
  }
}
