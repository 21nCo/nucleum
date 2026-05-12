import {
  authFnApiKeyPlugin,
  authFnEmailOtpPlugin,
  authFnMultiRegionPlugin,
  authFnNativeHandoffPlugin,
  authFnPasswordPlugin,
  authFnSchemaPlugin,
  authFnSocialOAuthPlugin,
  authFnTwoFactorPlugin,
  createAuthFn
} from '@authfn/core';
import type { Adapter, TableSchema } from '@superfunctions/db';

export const ACCOUNT_AUTH_NAMESPACE = 'nucleus_account';

const nucleusWidgetTokenTables: TableSchema[] = [
  {
    modelName: 'widget_tokens',
    fields: {
      id: { type: 'string', required: true, fieldName: 'id' },
      userId: { type: 'string', required: true, fieldName: 'user_id' },
      tokenHash: { type: 'string', required: true, fieldName: 'token_hash' },
      scopes: { type: 'json', required: true, fieldName: 'scopes' },
      regionId: { type: 'string', required: true, fieldName: 'region_id' },
      expiresAt: { type: 'date', required: true, fieldName: 'expires_at' },
      revokedAt: { type: 'date', required: false, fieldName: 'revoked_at' },
      createdAt: { type: 'date', required: true, fieldName: 'created_at' },
      updatedAt: { type: 'date', required: true, fieldName: 'updated_at' }
    },
    indexes: [
      {
        name: 'idx_nucleus_widget_tokens_hash',
        fields: ['tokenHash'],
        unique: true
      },
      {
        name: 'idx_nucleus_widget_tokens_user',
        fields: ['userId']
      }
    ]
  }
];

export const accountAuthSchemaSource = createAuthFn({
  database: {} as Adapter,
  namespace: ACCOUNT_AUTH_NAMESPACE,
  plugins: [
    authFnPasswordPlugin(),
    authFnEmailOtpPlugin(),
    authFnSocialOAuthPlugin(),
    authFnApiKeyPlugin(),
    authFnTwoFactorPlugin(),
    authFnMultiRegionPlugin(),
    authFnNativeHandoffPlugin(),
    authFnSchemaPlugin({
      name: 'nucleusWidgetTokens',
      schema: nucleusWidgetTokenTables
    })
  ]
});

export const accountAuthSchema = accountAuthSchemaSource.getSchema();
