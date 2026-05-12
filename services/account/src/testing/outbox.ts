import type {
  AuthFnDeliveryProvider,
  AuthFnDeliveryRequest,
  AuthFnDeliveryResult
} from '@authfn/core';

export interface AccountOutboxMessage extends AuthFnDeliveryRequest {
  sentAt: string;
}

export interface CapturingDeliveryProvider extends AuthFnDeliveryProvider {
  messages(): AccountOutboxMessage[];
  latest(identifier?: string): AccountOutboxMessage | null;
  clear(): void;
}

export function createCapturingDeliveryProvider(): CapturingDeliveryProvider {
  const messages: AccountOutboxMessage[] = [];

  return {
    async send(request: AuthFnDeliveryRequest): Promise<AuthFnDeliveryResult> {
      messages.push({
        ...request,
        sentAt: new Date().toISOString()
      });

      return {
        sent: true,
        metadata: {
          mode: 'test-outbox'
        }
      };
    },
    messages() {
      return messages.map((message) => ({ ...message }));
    },
    latest(identifier) {
      const normalized = identifier?.trim().toLowerCase();
      const matched = normalized
        ? messages.filter((message) => message.email.trim().toLowerCase() === normalized)
        : messages;
      return matched.at(-1) ? { ...matched.at(-1)! } : null;
    },
    clear() {
      messages.length = 0;
    }
  };
}
