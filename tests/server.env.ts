import { mockAgents } from "./fixtures";

export const environments = {
  dev: {
    agent: mockAgents.dev,
    domain: "tidigit.dev"
  },
  pre: {
    agent: mockAgents.pre,
    domain: "21n.xyz"
  },
  live: {
    agent: mockAgents.live,
    domain: "21n.live"
  }
};

export function setupTestEnvironment() {
  const env = process.env.ENV || "dev";
  return environments[env];
}
