# Data and synchronization

Source-reviewed on 2026-10-03. This document describes Nucleum's integration boundaries; external DataFn algorithmic guarantees are outside the client architecture checker. See [system architecture](system-architecture.md) and [deployment topology](deployment-topology.md).

## Storage boundaries

| Store | Owner and purpose |
| --- | --- |
| DataFn local records | [storage-lifecycle.ts](../../client/datafn/storage-lifecycle.ts) creates IndexedDB storage scoped by environment, product and user/guest namespace. |
| Local search index | [search-provider.ts](../../client/datafn/search-provider.ts) creates a SearchFn IndexedDB adapter in a separate search database. It is distinct from the record database. |
| Preferences and legacy data | [client-storage.ts](../../client/persistence/client-storage.ts), [Dexie](../../client/persistence/dexie), [legacy backup](../../client/persistence/legacy-backup) and [migrations](../../client/persistence/migrations) remain separate persistence/recovery concerns. |
| Account PostgreSQL | [Node adapter](../../services/account/src/db/node.ts) uses `DATABASE_URL`; [Worker adapter](../../services/account/src/db/cloudflare.ts) uses `ACCOUNT_DB` or `DATABASE_URL`, with generated AuthFn mappings. |
| Sync PostgreSQL | [Node adapter](../../services/account/src/db/datafn-node.ts) requires `DATAFN_DATABASE_URL`; [Worker adapter](../../services/account/src/db/sync-cloudflare.ts) uses `SYNC_DB` or `DATAFN_DATABASE_URL`. It does not fall back to the account binding. |
| Region lookup | [lookup adapters](../../services/account/src/lookup) locate account authority. Worker wiring supplies the Cloudflare Durable Object adapter; the configured fallback can use DynamoDB. This is not the resource-record database. |
| Runtime stores | [runtime-stores.ts](../../services/account/src/runtime-stores.ts) supplies Node memory stores or Worker cache KV plus optional Durable Object atomic state and directory. These are separate from account region lookup. |
| Remote search | [server search provider](../../services/account/src/datafn/search-provider.ts) installs OpenSearch only when configured. Search indexes are not the authoritative record store. |
| Diagnostics | [debug sink](../../services/debug-sink) has its own D1 persistence. Auth and sync must not depend on diagnostic delivery. |

Separate connection contracts do not prove physically separate database instances in a running environment. Deployment bindings and database configuration determine physical isolation.

## Runtime modes

[runtime-policy.ts](../../client/datafn/runtime-policy.ts) chooses modes; [datafn.store.ts](../../client/datafn/datafn.store.ts) creates the corresponding runtime.

| Mode | Selection and behavior |
| --- | --- |
| `local-only` | Guest/local account, or offline account with offline storage enabled. Uses local storage without a configured remote sync endpoint. |
| `sync` | Eligible online account with offline storage enabled. Uses namespace-scoped storage and remote HTTP sync; cross-tab support is enabled. |
| `sync-direct` | Eligible account with offline storage disabled. Remote sync configuration uses no persistent record adapter and disables cross-tab support. |

Both remote modes explicitly set `ws: false`; this integration is not a WebSocket replication topology. Synchronized hydration has separate boot and background resource sets. Namespace selection uses `user:<id>` for an account and `guest:<device-id>` otherwise; the server derives the authenticated namespace independently.

## Authenticated request path

```mermaid
sequenceDiagram
  participant Feature as Feature / resource store
  participant Client as Client DataFn runtime
  participant Auth as Regional AuthFn client
  participant API as Account service
  participant DB as Sync PostgreSQL
  Feature->>Client: Query or mutation
  Client->>Auth: Obtain transport auth
  Client->>API: Authenticated /datafn request
  API->>API: Authenticate; authorize mutations; resolve namespace
  API->>DB: DataFn operation through database adapter
  DB-->>API: Result
  API-->>Client: Protocol response
  Client-->>Feature: DataFn state / result
```

The sequence shows responsibility boundaries, not a guarantee that each local operation immediately makes a request. Local-first scheduling, pending operations and reconciliation belong to the external DataFn implementation and selected mode.

[Client auth](../../client/runtime/account/auth.ts) creates a regional AuthFn client, uses credentials for cookie sessions, and chooses cookie or hybrid session mode for the host. [remote-transport.ts](../../client/datafn/remote-transport.ts) reuses that transport auth for DataFn. Authority resolution is described in [deployment topology](deployment-topology.md).

The account [application](../../services/account/src/app.ts) registers CORS and [DataFn routes](../../services/account/src/datafn/routes.ts), which delegate `/datafn/*` to the configured DataFn router. The [server integration](../../services/account/src/datafn/server.ts) authenticates reads and applies mutation authorization to mutation, transaction, seed, push and reconciliation operations. Unknown resources are disabled. The [namespace helper](../../services/account/src/datafn/namespace.ts) normalizes the authenticated actor to a user namespace.

Public-link access is a separate path: the server installs the DataFn public-links plugin and resolves link context before normal session context. Scope enforcement depends on that plugin contract; the integration's public-link authorization branch must not be read as permission for arbitrary anonymous record access. [Client sharing](../../client/datafn/datafn-sharing.store.ts) owns Nucleum sharing integration.

## Encryption, recovery and lifecycle

[Encryption settings](../../client/datafn/encryption-settings.ts) and [E2EE state](../../client/datafn/datafnE2ee.store.ts) integrate local and remote settings. Runtime initialization handles recovery state before selecting the effective mode. Offline storage cannot be disabled while E2EE is enabled. This configuration statement does not establish which metadata is encrypted or the security guarantees of the external encryption implementation.

Runtime teardown closes storage and disposes search providers. Local clone deletion explicitly deletes both record and search databases. Record migrations, such as node child-order migration, belong to the DataFn local lifecycle. Legacy backup/import and Dexie migration paths retain their own owners; deleting a local clone is not equivalent to deleting remote account data or retiring legacy recovery.

File binaries follow [file transport](../../client/runtime/files/file-transport.ts) and signed object URLs. DataFn resource records and binary object upload therefore cross different service boundaries.

## Schema evolution and verification

[Domain schema](../../schema/datafn.ts) feeds the account [generation entry](../../services/account/src/datafn/sync.datafn.ts) and [generated Drizzle mappings](../../services/account/src/db/generated/datafn). Physical changes require a forward migration in [drizzle/datafn](../../services/account/drizzle/datafn). Generation alone does not upgrade a database.

Relevant verification entrypoints are declared in the [account package](../../services/account/package.json): `typecheck`, `test:datafn:migrations`, and ApiFn memory, multi-region, rate-limit and PostgreSQL suites. Use isolated test databases for migration and integration tests. Verify fresh creation and upgrade from committed history when changing physical schema.

For a failing user flow, trace browser requests first, then account logs and Caddy upstream health, then database assertions. Successful client import checks or a healthy `/health` endpoint do not establish sync correctness, persistence durability or cross-region behavior.
