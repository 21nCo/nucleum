#!/bin/sh
# Compiles the NativeTrust helpers from WebViewCommon.swift with the checks in
# this folder and runs them on macOS (no Xcode project or simulator needed).
set -eu
here=$(cd "$(dirname "$0")" && pwd)
source_file="$here/../Sources/NucleumNativeKit/WebView/WebViewCommon.swift"
work=$(mktemp -d "${TMPDIR:-/tmp}/native-trust-checks.XXXXXX")
trap 'rm -rf "$work"' EXIT
{
  echo "import Foundation"
  sed -n '/^\/\/ MARK: - NativeTrust (begin)$/,/^\/\/ MARK: - NativeTrust (end)$/p' "$source_file"
} > "$work/NativeTrust.swift"
cp "$here/NativeTrustChecks.swift" "$work/main.swift"
swiftc -o "$work/checks" "$work/NativeTrust.swift" "$work/main.swift"
"$work/checks"
