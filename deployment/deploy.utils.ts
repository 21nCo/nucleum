import { Region } from "./cdk/types/region.type";
import regions from "./regions.json";

export function resolveDomainName(env: { domain: string; subdomain?: string }) {
  if (env.subdomain) return `${env.subdomain}.${env.domain}`;
  return env.domain;
}

const regionMappings: Region[] = regions;

export function resolveProviderRegionCode(
  code: string,
  provider: string
): string | undefined {
  const mapping = regionMappings.find((x) => x.code === code);
  if (!mapping) {
    return undefined;
  }
  switch (provider.toLowerCase()) {
    case "aws":
      return mapping.aws;
    case "gcp":
      return mapping.gcp;
    case "azure":
      return mapping.azure;
    default:
      return undefined;
  }
}
