export default {
  router: './src/api/pointron/router.ts',
  openapi: {
    info: {
      title: 'Pointron API',
      version: '1.0.0',
      description:
        'Versioned REST API for Pointron. Authenticate with a personal access token as a Bearer token. Lists page with cursors, writes accept an Idempotency-Key, and errors are RFC 9457 problem details.'
    }
  }
};
