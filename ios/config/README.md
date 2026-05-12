# iOS Environment Config

`environments.json` drives `npm run ios:env:<env>` and writes small scalar
values into each app target's `Info.plist`.

- `product` is the full product web domain, for example `nucleum.app`.
- `NucleusAppEnvironment` is `local`, `dev`, `pre`, or `live`.
- `NucleusDefaultRegion` is the default account region used before auth
  resolves the user's actual region.
- `LocalConfig.webOrigin` derives the logical web origin from environment and
  product. The embedded WebView still loads the bundled `www` files via
  the custom `tauri://` scheme.
- `LocalConfig.accountUrl` derives the default AuthFn account service URL from
  environment, region, and account domain. Runtime handoff messages can still
  provide a more specific region authority.
- `widgetApiUrl` is computed in Swift as `accountUrl + "/widget"` as a
  temporary placeholder until the account service widget API is implemented.
