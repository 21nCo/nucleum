# iOS Environment Config

`environments.json` documents the iOS environment matrix used by the Xcode
build configurations. The app `Info.plist` files keep build-setting
substitutions such as `$(NUCLEUS_APP_ENVIRONMENT)` and Xcode resolves them from
the selected build configuration.

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

Available Xcode build configurations:

- `Local Debug` / `Local Release`
- `Dev Debug` / `Dev Release`
- `Pre Debug` / `Pre Release`
- `Live Debug` / `Live Release`

`Debug` and `Release` remain as compatibility defaults and point at the dev
environment.

Embedded iOS web bundles are generated separately because the WebView loads the
static files from `ios/<app>/www` and Vite resolves environment values at build
time. Use the matching npm command before building the native app:

- `npm run build:ios:local`
- `npm run build:ios:dev`
- `npm run build:ios:pre`
- `npm run build:ios:live`

Per-app variants are also available, for example:

- `npm run build:ios:nucleum:pre`
- `npm run build:ios:memotron:pre`
- `npm run build:ios:pointron:pre`

For a full pre test, run `npm run build:ios:pre`, then select `Pre Debug` in
Xcode. For a single app, run that app's `build:ios:<app>:pre` command and select
the same `Pre Debug` native build configuration.
