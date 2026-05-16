declare module 'sendfn/edge' {
  import type { SendEmailParams, EmailTransaction } from 'sendfn';

  export interface SendFnEdgeConfig {
    emailProvider: {
      sendEmail(request: {
        from: string;
        to: string[];
        cc?: string[];
        bcc?: string[];
        subject: string;
        html: string;
        text?: string;
        replyTo?: string;
        tags?: Record<string, string>;
        metadata?: Record<string, unknown>;
      }): Promise<{
        success: boolean;
        messageId?: string;
        providerMessageId?: string;
        timestamp: Date;
        error?: {
          code: string;
          message: string;
          retryable: boolean;
        };
      }>;
      close?(): Promise<void>;
    };
    email?: {
      from?: string;
      fromEmail?: string;
      fromName?: string;
    };
  }

  export interface SendFnEdgeClient {
    email(params: SendEmailParams): Promise<EmailTransaction>;
    close(): Promise<void>;
  }

  export function createSendFn(config: SendFnEdgeConfig): SendFnEdgeClient;
  export const sendFn: typeof createSendFn;
  export const sendfn: typeof createSendFn;

  export function resendAdapter(config: { apiKey: string }): SendFnEdgeConfig['emailProvider'];
}
