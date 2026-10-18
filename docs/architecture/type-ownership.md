# Type and contract ownership

Current type-placement contract. The constitution and semantic ownership rules remain authoritative. The inventory/checker verifies recorded destinations and baseline runtime enum declarations, not semantic placement of every type. Update the inventory in the same change that moves a type module.

Application, navigation, account, file, and command ownership lives in [client boundaries](client-boundaries.md). The TIDY-478 phase journal lives in [history/tidy-478-type-ownership.md](history/tidy-478-type-ownership.md).

## Conventions

Definitions stay beside their implementation unless independent consumers need a neutral contract. Feature contracts belong to the feature, and external callers use the public entries in `tools/check/feature-entrypoints.json`.

Portable UI controls own their structural prop and style types:

| Contract | Owner |
| --- | --- |
| Primitive prop and style types | `client/ui/elements` |
| Domain-neutral composition contracts | `client/ui/compositions` |
| Generic DOM-action contracts | `client/ui/actions` |
| Package-wide host contracts | `client/ui/hosts` |
| Portable platform state | `client/ui/environment` |
| Visual asset contracts | `client/ui/icons`, `client/ui/illustrations`, or `client/ui/branding` |

Those UI contracts do not derive from schema records, DataFn resources, runtime types, application actions, or state interfaces. Owning adapters translate domain models at the UI boundary.

| Contract | Owner |
| --- | --- |
| Keyboard and interaction mode | `client/ui/elements/keyboard` |
| Global action identifiers | `client/config`; capability-specific identifiers may live with their feature, such as memory actions. |
| Command host | `client/shared-state/commands` |
| Application events | `client/shared-state/events`. Focus and memory events live here. Clipper transport events live in `client/runtime/extensions`. |
| Resource panel and selection | `client/shared-state/resources` |
| Headless notification state | `client/shared-state/notifications` |
| Connected notification rendering | `client/shell/notifications` |
| Error recovery screens | `client/surfaces/help/errors` |
| Product menu contracts | `client/shell/navigation/app-menu.type.ts` |
| Browser ambient declarations | `client/ambient` |
| Cross-layer account, subscription, and legacy wire contracts | `schema` |
| Generated AuthFn and DataFn/Drizzle files | `services/account` generation scripts. Do not edit them by hand. |

`schema/account` owns profile and subscription wire data. Billing presentation fields stay in `client/surfaces/subscription`. `schema/legacy` owns the existing Surreal mutation, query, sync, resource-action, and store-data encodings. Do not derive those legacy shapes from current DataFn records. `schema/datafn.ts` derives resource names from `nucleumDatafnSchema`. Client `Resource` and `Product` compose schema values with the Next overlay; `MetaResource` directly aliases the schema value; backend callers import schema directly.

Generic error codes are schema-owned. The default error message belongs to `client/shared-state/notifications`. Markdown validation belongs to memory. Responsive text truncation belongs to the text primitive.

Native transcription model identifiers and worker model identifiers are different protocols. Both live in `client/runtime/inference`, in separate modules, with their original enum values.

The global `client/types` and `shared/types` packages are retired. Do not replace them with a catch-all types package or a compatibility export. Splits use a direct import to the actual owner.

## Import and export rules

Import interfaces and aliases with `import type` or a named `type` specifier. A runtime enum stays a value import. Do not re-export a moved definition from its former location. Public feature entries in `tools/check/feature-entrypoints.json` match the feature package exports. DataFn and schema expose their contracts directly.

`npm run check:architecture` checks static imports, exports, dynamic imports, import types, CommonJS requires, and Vitest mock imports. Production files under `schema`, `shared`, `server`, and `services` may not import `client` files. This boundary rule excludes tests/specs. Client-to-schema/shared imports are permitted subject to portable UI restrictions and workspace declarations. Retired package aliases are rejected in tests as well as production code. Historical specs and append-only `.conduct` reports may still name the old layout. Active guidance and configuration use the current owners.

`node tools/check/type-ownership.mjs` checks every recorded destination in [type-ownership-inventory.json](type-ownership-inventory.json) and compares runtime enum declarations to that baseline. One audited retirement is recorded there: the disconnected shell cache `CacheKey` enum. No other runtime-enum retirement is exempt.
