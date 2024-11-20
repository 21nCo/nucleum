import { CfnOutput, NestedStack } from "aws-cdk-lib";
import { CfnInstance, CfnStaticIp } from "aws-cdk-lib/aws-lightsail";
import { ARecord, RecordTarget, IHostedZone } from "aws-cdk-lib/aws-route53";
import {
  AwsCustomResource,
  AwsCustomResourcePolicy,
  PhysicalResourceId
} from "aws-cdk-lib/custom-resources";
import {
  Effect,
  ManagedPolicy,
  PolicyStatement,
  Role,
  ServicePrincipal
} from "aws-cdk-lib/aws-iam";
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
  domainName: string;
  instanceName: string;
  diskName: string;
  staticIpName: string;
  availabilityZone: string;
  constructor(scope: Construct, id: string, props: CustomNestedStackProps) {
    super(scope, id, props);
    console.log(
      `Constructing DatabaseLightsailRegionalStack for region: ${props.environment.region}`
    );
    const { zone, environment } = props;
    this.env = environment;
    this.zone = zone;
    this.domainName = props.isMasterDb
      ? "db." + environment.domain
      : environment.tidyregion + ".db." + environment.domain;
    this.certificate = resolveAcmCertificate(this, zone, this.domainName);
    this.staticIpName = this.domainName + "-static-ip";
    this.diskName =
      this.env.region + (props.isMasterDb ? "-master-db-disk" : "-db-disk");
    this.availabilityZone = this.env.region + "a";
    this.instanceName = `${this.domainName}-instance-nov24ix`;
    console.log(`Creating Lightsail instance: ${this.instanceName}`);

    const userDataScript = readFileSync(path.join(__dirname, "init.sh"), "utf8")
      .replace(/DOMAIN_NAME/g, this.domainName)
      .replace(/CERTIFICATE_ARN/g, this.certificate.certificateArn)
      .replace(/CERTIFICATE_REGION/g, this.env.region)
      .replace(/DB_PASS/g, this.env.lambdaEnv.DB_PASS)
      .replace(/CERT_EMAIL/g, this.env.email);

    const lightsailAssumableRole = new Role(this, "LightsailAssumableRole", {
      assumedBy: new ServicePrincipal("lightsail.amazonaws.com"),
      managedPolicies: [
        ManagedPolicy.fromAwsManagedPolicyName("AmazonSSMManagedInstanceCore")
      ]
    });

    // Add permissions to access ACM certificate
    lightsailAssumableRole.addToPolicy(
      new PolicyStatement({
        actions: ["acm:GetCertificate"],
        resources: [this.certificate.certificateArn],
        effect: Effect.ALLOW
      })
    );

    // Prepare the user data with proper shebang and logging
    const userDataWithLogging = `#!/bin/bash
exec > >(tee /var/log/user-data.log) 2>&1
echo "Starting user data script execution at $(date)"

# Wait for the disk to be attached
echo "Waiting for disk to be attached..."
while [ ! -e /dev/xvdf ]; do
  echo "Disk not found, retrying in 5 seconds..."
  sleep 5
done
echo "Disk /dev/xvdf is now available."

# Assume the IAM role
echo "Assuming IAM role..."
ROLE_ARN="${lightsailAssumableRole.roleArn}"
CREDENTIALS=$(aws sts assume-role --role-arn $ROLE_ARN --role-session-name LightsailSession)
export AWS_ACCESS_KEY_ID=$(echo $CREDENTIALS | jq -r '.Credentials.AccessKeyId')
export AWS_SECRET_ACCESS_KEY=$(echo $CREDENTIALS | jq -r '.Credentials.SecretAccessKey')
export AWS_SESSION_TOKEN=$(echo $CREDENTIALS | jq -r '.Credentials.SessionToken')
echo "IAM role assumed successfully."

# Original user data script
${userDataScript}

echo "User data script execution completed at $(date)"
`;

    const bundleId = this.resolveBundleId(
      this.env.environment,
      this.env.region,
      props.isMasterDb
    );

    /**
     *
     * aws lightsail get-blueprints
     * aws lightsail get-bundles
     */
    const instance = new CfnInstance(this, "LightsailInstance", {
      instanceName: this.instanceName,
      availabilityZone: this.availabilityZone,
      blueprintId: "amazon_linux_2023",
      bundleId,
      userData: userDataWithLogging,
      hardware: {
        disks: [
          {
            diskName: this.diskName,
            path: "/dev/xvdf"
          }
        ]
      }
    });

    lightsailAssumableRole.assumeRolePolicy?.addStatements(
      new PolicyStatement({
        actions: ["sts:AssumeRole"],
        effect: Effect.ALLOW,
        principals: [new ServicePrincipal("lightsail.amazonaws.com")]
      })
    );

    // // Configure instance ports (disable SSH, IPv6, and allow only HTTP/HTTPS)
    // const configureInstancePorts = new AwsCustomResource(
    //   this,
    //   "ConfigureInstancePorts",
    //   {
    //     onCreate: {
    //       service: "Lightsail",
    //       action: "putInstancePublicPorts",
    //       parameters: {
    //         instanceName: this.instanceName,
    //         portInfos: [
    //           {
    //             fromPort: 80,
    //             toPort: 80,
    //             protocol: "tcp",
    //             cidrs: ["0.0.0.0/0"],
    //             cidrListAliases: [],
    //             ipv6Cidrs: []
    //           },
    //           {
    //             fromPort: 443,
    //             toPort: 443,
    //             protocol: "tcp",
    //             cidrs: ["0.0.0.0/0"],
    //             cidrListAliases: [],
    //             ipv6Cidrs: []
    //           }
    //         ]
    //       },
    //       physicalResourceId: PhysicalResourceId.of(
    //         `${this.instanceName}-configure-ports`
    //       )
    //     },
    //     policy: AwsCustomResourcePolicy.fromStatements([
    //       new PolicyStatement({
    //         actions: ["lightsail:PutInstancePublicPorts"],
    //         resources: ["*"]
    //       })
    //     ])
    //   }
    // );

    // // Ensure the custom resource runs after the instance is created
    // configureInstancePorts.node.addDependency(instance);

    new CfnOutput(this, "NetworkingStatus", {
      value:
        "SSH (22) disabled, IPv6 disabled, HTTP (80) and HTTPS (443) enabled",
      description: "Instance Networking Configuration"
    });

    const staticIp = new CfnStaticIp(this, "LightsailStaticIp", {
      staticIpName: this.staticIpName,
      attachedTo: instance.ref
    });

    new ARecord(this, "DNSRecord", {
      zone: zone,
      recordName: this.domainName,
      target: RecordTarget.fromIpAddresses(staticIp.attrIpAddress)
    });

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

    // const userDataScript = readFileSync(path.join(__dirname, "init.sh"), "utf8")
    //   .replace(/DOMAIN_NAME/g, this.regionDomain)
    //   .replace(/CERTIFICATE_ARN/g, this.certificate.certificateArn)
    //   .replace(/DB_PASS/g, this.env.DB_PASS);
    // const encodedUserData = Buffer.from(userDataScript).toString("base64");
    // instance.addPropertyOverride("UserData", encodedUserData);

    new CfnOutput(this, "InstancePublicIp", {
      value: staticIp.ref,
      description: "Public IP address of the Lightsail instance"
    });
    new CfnOutput(this, "CertificateArn", {
      value: this.certificate.certificateArn,
      description: "ARN of the ACM certificate"
    });

    console.log(
      `Completed construction of DatabaseLightsailRegionalStack for region: ${props.environment.region}`
    );
  }
  /**
   *
   *    aws lightsail get-bundles --region <region>
   *
   * aws lightsail get-bundles --region <region> --query 'bundles[*].bundleId' --output text
   *
   * nano - 0.5 GB 2 vCPUs - 5% burst
   * micro - 1 GB 2 vCPUs - 10% burst
   * small - 2 GB 2 vCPUs - 15% burst
   * medium - 4 GB 2 vCPUs - 20% burst
   * large - 8 GB 2 vCPUs - 30% burst
   * xlarge - 16 GB 4 vCPUs - 40% burst
   * 2xlarge - 32 GB 8 vCPUs - 50% burst
   * 4xlarge - 64 GB 16 vCPUs - 60% burst
   *
   * @returns
   */
  resolveBundleId(env: string, region: string, isMasterDb: boolean = false) {
    let suffix = region === "ap-south-1" ? "_3_1" : "_3_0";
    if (isMasterDb) {
      const bundleSize = resolveForMasterDb();
      return bundleSize + suffix;
    }
    let bundleSize = "micro";
    switch (env) {
      case "dev":
        bundleSize = "micro";
        break;
      case "pre":
        bundleSize = "small";
        break;
      case "live":
        if (this.env.region === "ap-south-1") {
          bundleSize = "xlarge";
        } else {
          bundleSize = "large";
        }
        break;
      default:
        bundleSize = "micro";
        break;
    }
    return bundleSize + suffix;

    function resolveForMasterDb() {
      let bundleSize = "micro";
      switch (env) {
        case "dev":
          bundleSize = "nano";
          break;
        case "pre":
          bundleSize = "micro";
          break;
        case "live":
          bundleSize = "medium";
          break;
        default:
          bundleSize = "micro";
          break;
      }
      return bundleSize;
    }
  }
}
