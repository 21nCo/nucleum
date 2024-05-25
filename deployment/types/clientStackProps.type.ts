import { StackProps } from "aws-cdk-lib";

export interface ClientStackProps extends StackProps {
  domain: string;
  subdomain?: string;
}
