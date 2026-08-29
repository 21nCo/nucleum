import type { TableSchema } from '@superfunctions/db';

export const nucleusWidgetTokenTables: TableSchema[] = [
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
