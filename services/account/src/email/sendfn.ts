import type { Adapter } from '@superfunctions/db';
import type {
  AuthFnDeliveryMessage,
  AuthFnDeliveryProvider,
  AuthFnDeliveryRequest,
  AuthFnDeliveryResult
} from 'authfn';
import {
  createSendFn,
  createSendFnDeliveryProvider as createSendFnEmailDeliveryProvider,
  resendAdapter
} from 'sendfn/edge';
import type { Logger } from '@logfn/core';

export function createSendFnDeliveryProvider(input: {
  database: Adapter;
  logger: Logger;
}): AuthFnDeliveryProvider {
  const sender = resolveAccountEmailSender();
  const resendApiKey = process.env.RESEND_API_KEY;
  const sendfn = resendApiKey
    ? createSendFn({
        email: {
          from: sender.header
        },
        emailProvider: resendAdapter({
          apiKey: resendApiKey
        })
      })
    : null;
  const delivery = sendfn
    ? createSendFnEmailDeliveryProvider<AuthFnDeliveryRequest>(sendfn)
    : null;

  return {
    async send(request: AuthFnDeliveryRequest): Promise<AuthFnDeliveryResult> {
      if (!delivery) {
        if (!allowsLocalDelivery()) {
          input.logger.error('authfn otp delivery is not configured for production', {
            purpose: request.purpose,
            email: request.email,
            challengeId: request.challengeId
          });
          return {
            sent: false,
            metadata: {
              mode: 'unconfigured'
            }
          };
        }

        input.logger.info('authfn otp delivery captured locally', {
          purpose: request.purpose,
          email: request.email,
          challengeId: request.challengeId,
          code: process.env.NODE_ENV === 'production' ? '[REDACTED]' : request.code
        });
        return {
          sent: true,
          metadata: {
            mode: 'local'
          }
        };
      }

      return delivery.send(request);
    }
  };
}

/**
 * Builds account-service OTP email content before the shared delivery provider sends it.
 */
export function createAccountOtpDeliveryMessage(
  request: AuthFnDeliveryRequest
): AuthFnDeliveryMessage {
  return {
    subject: subjectForPurpose(request.purpose),
    text: `Your Nucleus verification code is ${request.code}. It expires shortly.`,
    html: `<p>Your Nucleus verification code is <strong>${escapeHtml(request.code)}</strong>.</p><p>It expires shortly.</p>`,
    metadata: {
      purpose: request.purpose,
      challengeId: request.challengeId
    }
  };
}

function allowsLocalDelivery(): boolean {
  if (process.env.ACCOUNT_EMAIL_LOCAL_DELIVERY === 'true') {
    return true;
  }
  return process.env.NODE_ENV !== 'production';
}

function subjectForPurpose(purpose: AuthFnDeliveryRequest['purpose']): string {
  switch (purpose) {
    case 'reset-password':
      return 'Reset your Nucleus password';
    case 'sign-in':
      return 'Your Nucleus sign-in code';
    case 'sign-up':
      return 'Your Nucleus sign-up code';
    case 'verify-email':
      return 'Verify your Nucleus email';
  }
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function resolveAccountEmailSender(): { header: string; email: string } {
  const from = (process.env.ACCOUNT_EMAIL_FROM ?? 'accounts@nucleus.to').trim();
  const fromName = process.env.ACCOUNT_EMAIL_FROM_NAME?.trim();
  const parsedFrom = parseSender(from);
  if (parsedFrom) {
    const displayName = fromName || parsedFrom.name;
    return {
      header: displayName ? `${displayName} <${parsedFrom.email}>` : parsedFrom.email,
      email: parsedFrom.email
    };
  }

  if (!isBareEmail(from)) {
    throw new Error(
      'ACCOUNT_EMAIL_FROM must be an email address or a sender string like "Nucleum <no-reply@example.com>"'
    );
  }

  return {
    header: fromName ? `${fromName} <${from}>` : from,
    email: from
  };
}

function parseSender(value: string): { name?: string; email: string } | null {
  if (isBareEmail(value)) {
    return {
      email: value
    };
  }

  const match = value.match(/^(.+?)\s*<([^<>]+)>$/);
  if (!match) {
    return null;
  }

  const name = match[1].trim().replace(/^"(.+)"$/, '$1');
  const email = match[2].trim();
  if (!name || !isBareEmail(email)) {
    return null;
  }

  return {
    name,
    email
  };
}

function isBareEmail(value: string): boolean {
  return /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value);
}
