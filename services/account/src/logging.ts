import { serverLogger } from 'logfn';

export function createAccountLogger() {
  return serverLogger({
    name: 'nucleus-account',
    level: process.env.LOG_LEVEL as never ?? 'info'
  });
}
