# Data and synchronization

Source-reviewed on 2026-10-03. This document describes Nucleum's integration boundaries; external DataFn algorithmic guarantees are outside the client architecture checker. See [system architecture](system-architecture.md) and [deployment topology](deployment-topology.md).

## Storage boundaries

| Store | Owner and purpose |
| --- | --- |
| DataFn local records | [storage-lifecycle.ts](../../client/datafn/storage-lifecycle.ts) creates IndexedDB storage scoped by environment, product and user/guest namespace. |
| Local search index | [search-provider.ts](../../client/datafn/search-provider.ts) creates a SearchFn IndexedDB adapter in a separate search database. It is distinct from the record database. |
| Preferences and legacy data | [client-storage.ts](../../client/persistence/client-storage.ts), [Dexie](../../client/persistence/dexie), [legacy backup](../../client/persistence/legacy-backup) and [migrations](../../client/persistence/migrations) remain separate persistence/recovery concerns. |
| Account PostgreSQL | [Node adapter](../../services/account/src/db/node.ts) uses `DATABASE_URL`; [Worker adapter](../../services/account/src/db/cloudflare.ts) uses `ACCOUNT_DB` or `DATABASE_URL`, with generated AuthFn mappings. |
| Sync PostgreSQL | [Node adapter](../../services/account/src/db/datafn-node.ts) requires `DATAFN_DATABASE_URL`; [Worker adapter](../../services/account/src/db/sync-cloudflare.ts) uses `SYNC_DB` or `DATAFN_DATABASE_URL`. It does not fall back to the account binding. The [FileFn tables](../../services/account/src/files/database.ts) (files, versions and storage keys) live in the same regional database. |
| Region lookup | [lookup adapters](../../services/account/src/lookup) locate account authority. Worker wiring supplies the Cloudflare Durable Object adapter; only the [Node entry](../../services/account/src/node.ts) wires the DynamoDB adapter, so the Worker bundle carries no AWS SDK. This is not the resource-record database. |
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
  API->>API: Authenticate; authorize app scopes and mutations; resolve namespace
  API->>DB: DataFn operation through database adapter
  DB-->>API: Result
  API->>API: Filter shared resources for app-scoped sessions
  API-->>Client: Protocol response
  Client-->>Feature: DataFn state / result
```

The sequence shows responsibility boundaries, not a guarantee that each local operation immediately makes a request. Local-first scheduling, pending operations and reconciliation belong to the external DataFn implementation and selected mode.

[Client auth](../../client/runtime/account/auth.ts) creates a regional AuthFn client, uses credentials for cookie sessions, and chooses cookie or hybrid session mode for the host. [remote-transport.ts](../../client/datafn/remote-transport.ts) reuses that transport auth for DataFn. Authority resolution is described in [deployment topology](deployment-topology.md).

The account [application](../../services/account/src/app.ts) registers CORS, [DataFn routes](../../services/account/src/datafn/routes.ts), which delegate `/datafn/*` to the configured DataFn router, and [FileFn routes](../../services/account/src/files/routes.ts), which delegate `/files/*` to FileFn with the AuthFn session actor as the file principal and the region's R2 bucket for file bytes. The [server integration](../../services/account/src/datafn/server.ts) authenticates reads and applies mutation authorization to mutation, transaction, seed, push and reconciliation operations. Unknown resources are disabled. The [namespace helper](../../services/account/src/datafn/namespace.ts) normalizes the authenticated actor to a user namespace; API keys act as their owning user, and keys without an owner are refused.

[App scopes](../../services/account/src/datafn/app-scopes.ts) authorize every read and write of an API-key session. The registry grants `memotron`, `pointron` and `nucleum` each `read` and `write`, plus `*`; a write needs `<app>:write`. Cookie sessions, `*` and `nucleum` keys reach every resource. A `memotron` or `pointron` key reaches its app's resources, which the [ownership table](../../services/account/src/datafn/resource-ownership.ts) derives from the product features in `@nucleum/schema`, and the resources both apps share only filtered to its app: collections, properties and access logs need a `resource` filter inside the grant; space items, views (through their linked collections) and link tags (through the links they tag) are filtered out of query and transaction responses, so view and link tag queries cannot page, count or group, and space queries cannot filter, sort or group by items. A space item that points at a shared resource is visible only when the stored record passes that resource's own filter. Writes to a shared record check the stored record, and a space write needs every old and new item visible. Every relation a write makes, whether through `relations`, a foreign-key field such as `typeToExtend`, or relation metadata naming a record such as `collectionId`, must target a record inside the grant. A write's `record.id` must repeat the mutation id, and relation metadata cannot set a join row's id or endpoint columns. Scoped keys cannot clone, pull, seed or reconcile the whole namespace.

Public-link access is a separate path: the server installs the DataFn public-links plugin and resolves link context before normal session context. Scope enforcement depends on that plugin contract; the integration's public-link authorization branch must not be read as permission for arbitrary anonymous record access. Creating or revoking public links needs a user session that holds every app scope, because a link can expose any record in the namespace. [Client sharing](../../client/datafn/datafn-sharing.store.ts) owns Nucleum sharing integration.

## Encryption, recovery and lifecycle

[Encryption settings](../../client/datafn/encryption-settings.ts) and [E2EE state](../../client/datafn/datafnE2ee.store.ts) integrate local and remote settings. Runtime initialization handles recovery state before selecting the effective mode. Offline storage cannot be disabled while E2EE is enabled. This configuration statement does not establish which metadata is encrypted or the security guarantees of the external encryption implementation.

Runtime teardown closes storage and disposes search providers. Local clone deletion explicitly deletes both record and search databases. Record migrations, such as node child-order migration, belong to the DataFn local lifecycle. Legacy backup/import and Dexie migration paths retain their own owners; deleting a local clone is not equivalent to deleting remote account data or retiring legacy recovery.

File binaries follow [file transport](../../client/runtime/files/file-transport.ts) and signed object URLs. DataFn resource records and binary object upload therefore cross different service boundaries.

## Schema evolution and verification

[Domain schema](../../schema/datafn.ts) feeds the account [generation entry](../../services/account/src/datafn/sync.datafn.ts) and [generated Drizzle mappings](../../services/account/src/db/generated/datafn). Physical changes require a forward migration in [drizzle/datafn](../../services/account/drizzle/datafn). Generation alone does not upgrade a database.

Relevant verification entrypoints are declared in the [account package](../../services/account/package.json): `typecheck`, `test:datafn:migrations`, and ApiFn memory, multi-region, rate-limit and PostgreSQL suites. The `account` Vitest project in [tests](../../tests/projects/account.vitest.config.ts) runs the app-scope tests through the DataFn HTTP routes. Use isolated test databases for migration and integration tests. Verify fresh creation and upgrade from committed history when changing physical schema.

For a failing user flow, trace browser requests first, then account logs and Caddy upstream health, then database assertions. Successful client import checks or a healthy `/health` endpoint do not establish sync correctness, persistence durability or cross-region behavior.
