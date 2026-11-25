export default {
  router: './src/api/memotron/router.ts',
  openapi: {
    info: {
      title: 'Memotron API',
      version: '1.0.0',
      description:
        'Versioned REST API for Memotron. Authenticate with a personal access token as a Bearer token. Lists page with cursors, writes accept an Idempotency-Key, and errors are RFC 9457 problem details.'
    }
  }
};
