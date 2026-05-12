# Nucleus Debug Sink

Small Cloudflare Worker + D1 log sink for local native/WebView auth debugging.

## Local

```sh
npm --workspace @21n/debug-sink run d1:migrate:local
DEBUG_SINK_ALLOW_UNAUTHENTICATED=true npm --workspace @21n/debug-sink run dev -- --port 8790 --local
```

The root `Caddyfile` proxies this through:

```txt
https://account-insouth-local.nucleum.app/debug-sink
```

Useful probes:

```sh
curl -ksS -X POST https://account-insouth-local.nucleum.app/debug-sink/v1/logs \
  -H 'content-type: application/json' \
  --data '{"source":"manual","level":"info","app":"nucleum","message":"hello"}'

curl -ksS 'https://account-insouth-local.nucleum.app/debug-sink/v1/logs?limit=50'
```

## Cloudflare

Remote deployment needs `CLOUDFLARE_API_TOKEN` in the shell running Wrangler.

```sh
export CLOUDFLARE_API_TOKEN=...
npm --workspace @21n/debug-sink run d1:create
```

Copy the returned `database_id` into `wrangler.toml`, then:

```sh
npm --workspace @21n/debug-sink run d1:migrate:remote
npm --workspace @21n/debug-sink run deploy
```

Current deployed URL:

```txt
https://nucleus-debug-sink.21n.workers.dev
```

Remote deployments must be protected:

```sh
npx wrangler secret put DEBUG_SINK_WRITE_TOKEN
npx wrangler secret put DEBUG_SINK_READ_TOKEN
```

For explicitly unauthenticated local experiments only, run with
`DEBUG_SINK_ALLOW_UNAUTHENTICATED=true`.
