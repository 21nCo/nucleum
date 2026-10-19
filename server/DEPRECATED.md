This folder `server` is a legacy server codebase and is no longer deployed from this repository. Use the `services` folder for new work.

Legacy sync, relay, Surreal query archives and Gathery spaces handlers were removed because DataFn and the account service in `services/account` replace them.

The remaining code is kept until it is migrated to `services`:

- `common/plan`: subscriptions, billing, Apple and Dodo payment verification, restore and cancellation.
- `common/account`, `common/user`, `common/auth`, `common/oauth`: legacy account, user and OAuth handlers.
- `embed/widget`, `s3.ts`, `s3v2.ts`, `utils`: widget, file storage and shared helpers.
- `database/providers`, `surrealHelpers.ts`, and the `common/sync` providers and helpers that the code above still imports.
